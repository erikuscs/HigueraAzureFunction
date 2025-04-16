import { SecurityConfig, MonitoringConfig } from './config';
import rateLimit from 'express-rate-limit';
import { Context } from '@azure/functions';
import { trackException } from "./monitoringService";

// Rate limiting middleware
export const rateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: SecurityConfig.maxRequestsPerMinute
});

// IP restriction middleware
export function ipRestriction(context: Context): boolean {
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

    if (!isAllowed) {
        trackException(new Error('IP restriction failed'), {
            clientIP: clientIP || 'unknown',
            source: context.executionContext.functionName
        });
    }

    return isAllowed;
}

// Request validation middleware
export function validateRequest(context: Context): boolean {
    const authHeader = context.req?.headers['authorization'];
    if (!authHeader) {
        trackException(new Error('Missing authorization header'), {
            source: context.executionContext.functionName
        });
        return false;
    }

    // Validate JWT token
    try {
        const token = authHeader.replace('Bearer ', '');
        // Token validation logic would go here
        // For now, just check if it exists
        return !!token;
    } catch (error) {
        trackException(error as Error, {
            source: context.executionContext.functionName
        });
        return false;
    }
}

// Performance monitoring middleware
export function monitorPerformance(context: Context, operationName: string) {
    const startTime = Date.now();
    
    return {
        end: () => {
            const duration = Date.now() - startTime;
            context.log.info('Operation completed', {
                name: operationName,
                duration,
                success: !context.res?.status || context.res.status < 400,
                functionName: context.executionContext.functionName,
                invocationId: context.executionContext.invocationId
            });
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

export function validateContentType(context: Context, expectedType: string): boolean {
    const contentType = context.req?.headers['content-type'] || '';
    return contentType.toLowerCase().includes(expectedType.toLowerCase());
}