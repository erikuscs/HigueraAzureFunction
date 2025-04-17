import { SecurityConfig, MonitoringConfig, defaultSecurityConfig } from './config';

// Server-only modules that will be imported conditionally
let rateLimit = null;
let trackExceptionFn = null;

// Only import server-side modules when running on the server
if (typeof window === 'undefined') {
  try {
    rateLimit = require('express-rate-limit');
    const { trackException } = require('./monitoringService');
    trackExceptionFn = trackException;
  } catch (error) {
    console.error('Error importing server-side modules:', error);
  }
}

// Rate limiting middleware - will only work on server side
export const rateLimiter = typeof window === 'undefined' && rateLimit ? 
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: defaultSecurityConfig.maxRequestsPerMinute
  }) : 
  (req, res, next) => {
    if (next) next();
  };

// IP restriction middleware
export function ipRestriction(context: any): boolean {
    const allowedIPs = process.env.ALLOWED_IPS?.split(',') || [];
    const clientIP = context.req?.headers['x-forwarded-for'] || 
                    context.req?.connection.remoteAddress;
                    
    if (allowedIPs.length === 0) return true; // No IP restrictions
    
    const isAllowed = allowedIPs.some(ip => {
        if (ip.includes('*')) {
            const pattern = ip.replace(/\./g, '\\.').replace(/\*/g, '.*');
            return new RegExp(`^${pattern}$`).test(clientIP || '');
        }
        return ip === clientIP;
    });

    if (!isAllowed && typeof window === 'undefined' && trackExceptionFn) {
        trackExceptionFn(new Error('IP restriction failed'), {
            clientIP: clientIP || 'unknown',
            source: context.executionContext.functionName
        });
    }

    return isAllowed;
}

// Request validation middleware
export function validateRequest(context: any): boolean {
    const authHeader = context.req?.headers['authorization'];
    if (!authHeader) {
        if (typeof window === 'undefined' && trackExceptionFn) {
            trackExceptionFn(new Error('Missing authorization header'), {
                source: context.executionContext.functionName
            });
        }
        return false;
    }

    // Validate JWT token
    try {
        const token = authHeader.replace('Bearer ', '');
        // Token validation logic would go here
        // For now, just check if it exists
        return !!token;
    } catch (error) {
        if (typeof window === 'undefined' && trackExceptionFn) {
            trackExceptionFn(error as Error, {
                source: context.executionContext.functionName
            });
        }
        return false;
    }
}

// Performance monitoring middleware
export function monitorPerformance(context: any, operationName: string) {
    const startTime = Date.now();
    
    return {
        end: () => {
            const duration = Date.now() - startTime;
            if (context.log && typeof context.log.info === 'function') {
                context.log.info('Operation completed', {
                    name: operationName,
                    duration,
                    success: !context.res?.status || context.res.status < 400,
                    functionName: context.executionContext?.functionName,
                    invocationId: context.executionContext?.invocationId
                });
            }
        }
    };
}

export function sanitizeInput(input: any): any {
    if (typeof input === 'string') {
        // Remove potential XSS content
        return input
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '');
    } else if (Array.isArray(input)) {
        return input.map(item => sanitizeInput(item));
    } else if (typeof input === 'object' && input !== null) {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(input)) {
            sanitized[key] = sanitizeInput(value);
        }
        return sanitized;
    }
    return input;
}

export function validateContentType(context: any, expectedType: string): boolean {
    const contentType = context.req?.headers['content-type'] || '';
    return contentType.toLowerCase().includes(expectedType.toLowerCase());
}

// Auth middleware for Next.js API routes
export function withApiAuth(handler) {
    return async (req, res) => {
        // Authentication logic would go here
        // For now, just pass through
        return handler(req, res);
    };
}