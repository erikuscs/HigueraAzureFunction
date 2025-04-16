import { Context } from '@azure/functions';
import { NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { trackException } from './monitoringService';
import { defaultSecurityConfig } from './config';
import { AzureFunction, HttpRequest } from "@azure/functions";
import * as jwt from 'jsonwebtoken';
import { AppError } from './utils';
import { cacheService } from './cacheService';

// CORS configuration
const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        const allowedOrigins = defaultSecurityConfig.allowedOrigins;
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            callback(null, true);
            return;
        }

        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            trackException(new Error('CORS Origin Rejected'), {
                origin,
                allowedOrigins: allowedOrigins.join(',')
            });
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
};

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: defaultSecurityConfig.maxRequestsPerMinute,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: any) => {
        // Skip rate limiting for certain conditions (e.g., internal network)
        const clientIP = req.ip || req.connection.remoteAddress;
        return clientIP.startsWith('10.') || clientIP.startsWith('172.16.') || clientIP.startsWith('192.168.');
    }
});

// Helmet configuration for security headers
const helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://*.azure.com", "https://*.microsoftonline.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
};

// Apply security middleware to Azure Function context
export function applySecurityMiddleware(context: Context, req: any, next: NextFunction) {
    // Apply CORS
    cors(corsOptions)(req, context.res as any, (err: Error) => {
        if (err) {
            trackException(err, { middleware: 'cors' });
            context.res = {
                status: 403,
                body: { error: 'CORS not allowed' }
            };
            return;
        }

        // Apply rate limiting
        limiter(req, context.res as any, (err: Error) => {
            if (err) {
                trackException(err, { middleware: 'rateLimit' });
                context.res = {
                    status: 429,
                    body: { error: 'Too many requests' }
                };
                return;
            }

            // Apply Helmet security headers
            helmet(helmetConfig)(req, context.res as any, (err: Error) => {
                if (err) {
                    trackException(err, { middleware: 'helmet' });
                    context.res = {
                        status: 500,
                        body: { error: 'Security middleware error' }
                    };
                    return;
                }

                // Continue to next middleware or function
                next();
            });
        });
    });
}

// Function to validate JWT tokens
export async function validateToken(authHeader: string): Promise<boolean> {
    if (!authHeader?.startsWith('Bearer ')) {
        return false;
    }

    try {
        const token = authHeader.substring(7);
        // Token validation logic here using MSAL
        // This is a placeholder - actual implementation would validate against Azure AD
        return token.length > 0;
    } catch (error) {
        trackException(error as Error, { operation: 'validateToken' });
        return false;
    }
}

// Security headers middleware
export function addSecurityHeaders(context: Context) {
    const headers = {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'",
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };

    context.res = {
        ...context.res,
        headers: {
            ...context.res?.headers,
            ...headers
        }
    };
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // per window

interface RateLimitInfo {
    count: number;
    resetTime: number;
}

export const securityMiddleware = async (
    context: Context,
    req: HttpRequest,
    next: AzureFunction
): Promise<void> => {
    try {
        await validateCORS(context, req);
        await validateRateLimit(context, req);
        await validateAuth(context, req);
        
        // Add security headers
        context.res = {
            ...context.res,
            headers: {
                ...context.res?.headers,
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
                'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
                'Content-Security-Policy': "default-src 'self'",
                'Referrer-Policy': 'strict-origin-when-cross-origin'
            }
        };

        await next(context, req);
    } catch (error) {
        handleError(context, error as Error);
    }
};

async function validateCORS(context: Context, req: HttpRequest): Promise<void> {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
        context.res = {
            ...context.res,
            headers: {
                ...context.res?.headers,
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400'
            }
        };
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 204,
            headers: context.res?.headers
        };
        context.done();
    }
}

async function validateRateLimit(context: Context, req: HttpRequest): Promise<void> {
    const clientIp = req.headers['x-forwarded-for'] || req.ip;
    const cacheKey = `ratelimit:${clientIp}`;

    let rateLimitInfo: RateLimitInfo = await cacheService.get(cacheKey) || {
        count: 0,
        resetTime: Date.now() + RATE_LIMIT_WINDOW_MS
    };

    if (Date.now() > rateLimitInfo.resetTime) {
        rateLimitInfo = {
            count: 0,
            resetTime: Date.now() + RATE_LIMIT_WINDOW_MS
        };
    }

    rateLimitInfo.count++;

    if (rateLimitInfo.count > MAX_REQUESTS) {
        throw new AppError('Too many requests', 429);
    }

    await cacheService.set(cacheKey, rateLimitInfo, RATE_LIMIT_WINDOW_MS / 1000);

    // Add rate limit headers
    context.res = {
        ...context.res,
        headers: {
            ...context.res?.headers,
            'X-RateLimit-Limit': MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': (MAX_REQUESTS - rateLimitInfo.count).toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitInfo.resetTime / 1000).toString()
        }
    };
}

async function validateAuth(context: Context, req: HttpRequest): Promise<void> {
    // Skip auth for public endpoints
    const publicPaths = ['/api/health', '/api/public'];
    if (publicPaths.some(path => req.url.includes(path))) {
        return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new AppError('Missing authorization header', 401);
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme.toLowerCase() !== 'bearer' || !token) {
        throw new AppError('Invalid authorization scheme', 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '');
        context.req.user = decoded;
    } catch (error) {
        throw new AppError('Invalid token', 401);
    }
}

function handleError(context: Context, error: Error): void {
    const status = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof AppError ? error.message : 'Internal Server Error';

    trackException(error, {
        component: 'SecurityMiddleware',
        status: status.toString()
    });

    context.res = {
        status,
        headers: {
            'Content-Type': 'application/json'
        },
        body: {
            error: message
        }
    };

    context.done();
}