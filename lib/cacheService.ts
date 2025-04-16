import { createClient } from 'redis';
import { AppError } from './utils';
import { trackException } from './monitoringService';

interface ICacheService {
    get(key: string): Promise<any>;
    set(key: string, value: any, ttlSeconds?: number): Promise<void>;
    delete(key: string): Promise<void>;
}

class RedisCache implements ICacheService {
    private client;
    private isConnected: boolean = false;

    constructor() {
        this.initializeRedis();
    }

    private async initializeRedis() {
        try {
            this.client = createClient({
                url: process.env.REDIS_CONNECTION_STRING,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 10) return new Error('Redis max retries reached');
                        return Math.min(retries * 100, 3000);
                    }
                }
            });

            this.client.on('error', (err) => {
                trackException(err, { service: 'RedisCache' });
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                this.isConnected = true;
            });

            await this.client.connect();
        } catch (error) {
            trackException(error as Error, { 
                service: 'RedisCache',
                operation: 'initializeRedis'
            });
            this.isConnected = false;
        }
    }

    async get(key: string): Promise<any> {
        if (!this.isConnected) {
            throw new AppError('Redis not connected', 503);
        }

        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            trackException(error as Error, {
                service: 'RedisCache',
                operation: 'get',
                key
            });
            throw error;
        }
    }

    async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
        if (!this.isConnected) {
            throw new AppError('Redis not connected', 503);
        }

        try {
            const serializedValue = JSON.stringify(value);
            await this.client.set(key, serializedValue, {
                EX: ttlSeconds
            });
        } catch (error) {
            trackException(error as Error, {
                service: 'RedisCache',
                operation: 'set',
                key
            });
            throw error;
        }
    }

    async delete(key: string): Promise<void> {
        if (!this.isConnected) {
            throw new AppError('Redis not connected', 503);
        }

        try {
            await this.client.del(key);
        } catch (error) {
            trackException(error as Error, {
                service: 'RedisCache',
                operation: 'delete',
                key
            });
            throw error;
        }
    }
}

class InMemoryCache implements ICacheService {
    private cache: Map<string, { value: any; expiry: number }> = new Map();

    async get(key: string): Promise<any> {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
        const expiry = Date.now() + (ttlSeconds * 1000);
        this.cache.set(key, { value, expiry });

        // Cleanup expired items periodically
        if (this.cache.size > 100) {
            this.cleanup();
        }
    }

    async delete(key: string): Promise<void> {
        this.cache.delete(key);
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
    }
}

class CacheService implements ICacheService {
    private static instance: CacheService;
    private primaryCache: ICacheService;
    private fallbackCache: ICacheService;

    private constructor() {
        this.fallbackCache = new InMemoryCache();
        this.primaryCache = process.env.REDIS_CONNECTION_STRING ?
            new RedisCache() :
            this.fallbackCache;
    }

    public static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }

    async get(key: string): Promise<any> {
        try {
            return await this.primaryCache.get(key);
        } catch (error) {
            trackException(error as Error, {
                service: 'CacheService',
                operation: 'get',
                key
            });
            return this.fallbackCache.get(key);
        }
    }

    async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
        try {
            await this.primaryCache.set(key, value, ttlSeconds);
        } catch (error) {
            trackException(error as Error, {
                service: 'CacheService',
                operation: 'set',
                key
            });
            await this.fallbackCache.set(key, value, ttlSeconds);
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.primaryCache.delete(key);
        } catch (error) {
            trackException(error as Error, {
                service: 'CacheService',
                operation: 'delete',
                key
            });
            await this.fallbackCache.delete(key);
        }
    }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();