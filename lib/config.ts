import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { trackException } from './monitoringService';

const credential = new DefaultAzureCredential();
let secretClient: SecretClient | null = null;

// Initialize Key Vault client
async function initializeKeyVault() {
    if (!secretClient && process.env.KEY_VAULT_URL) {
        try {
            secretClient = new SecretClient(process.env.KEY_VAULT_URL, credential);
        } catch (error) {
            trackException(error as Error, { service: 'KeyVault' });
            throw error;
        }
    }
}

export interface SecurityConfig {
    maxRequestsPerMinute: number;
    jwtSecret: string;
    allowedOrigins: string[];
}

export interface MonitoringConfig {
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    sampleRate: number;
}

// Cache for secrets to reduce Key Vault calls
const secretsCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL = 3600000; // 1 hour

export async function getSecretConfig(secretName: string): Promise<string | undefined> {
    // Check cache first
    const cached = secretsCache.get(secretName);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.value;
    }

    // If not in cache or expired, get from Key Vault
    try {
        await initializeKeyVault();
        if (!secretClient) {
            return process.env[secretName];
        }

        const secret = await secretClient.getSecret(secretName);
        
        // Update cache
        secretsCache.set(secretName, {
            value: secret.value!,
            expiresAt: Date.now() + CACHE_TTL
        });

        return secret.value;
    } catch (error) {
        trackException(error as Error, {
            operation: 'getSecretConfig',
            secretName
        });
        // Fallback to environment variable
        return process.env[secretName];
    }
}

export const defaultSecurityConfig: SecurityConfig = {
    maxRequestsPerMinute: 60,
    jwtSecret: process.env.JWT_SECRET || 'your-default-secret',
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || '').split(',')
};

export const defaultMonitoringConfig: MonitoringConfig = {
    logLevel: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug',
    sampleRate: Number(process.env.MONITORING_SAMPLE_RATE || '1')
};