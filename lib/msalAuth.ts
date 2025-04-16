import { PublicClientApplication, Configuration, AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { trackException, trackEvent } from './monitoringService';
import { cacheService } from './cacheService';

const msalConfig: Configuration = {
    auth: {
        clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID!,
        authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID}`,
        redirectUri: typeof window !== 'undefined' ? window.location.origin : undefined,
        postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
    cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false,
    },
    system: {
        allowNativeBroker: false,
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (!containsPii) {
                    switch (level) {
                        case 0: // Error
                            trackException(new Error(message));
                            break;
                        case 2: // Info
                            console.info(message);
                            break;
                        case 3: // Verbose
                            console.debug(message);
                            break;
                    }
                }
            },
            logLevel: 2
        }
    }
};

export class AuthService {
    private static instance: AuthService;
    private msalInstance: PublicClientApplication;
    private currentAccount: AccountInfo | null = null;

    private constructor() {
        this.msalInstance = new PublicClientApplication(msalConfig);
    }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    async initialize(): Promise<void> {
        try {
            await this.msalInstance.initialize();
            await this.msalInstance.handleRedirectPromise();
            
            const accounts = this.msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                this.currentAccount = accounts[0];
                trackEvent('auth_initialized', { success: 'true' });
            }
        } catch (error) {
            trackException(error as Error, { operation: 'auth_initialize' });
            throw error;
        }
    }

    async login(): Promise<void> {
        try {
            const loginRequest = {
                scopes: ['User.Read', 'Mail.Send']
            };

            await this.msalInstance.loginRedirect(loginRequest);
            trackEvent('auth_login_initiated');
        } catch (error) {
            trackException(error as Error, { operation: 'auth_login' });
            throw error;
        }
    }

    async logout(): Promise<void> {
        try {
            await this.msalInstance.logoutRedirect();
            this.currentAccount = null;
            trackEvent('auth_logout');
        } catch (error) {
            trackException(error as Error, { operation: 'auth_logout' });
            throw error;
        }
    }

    async acquireToken(scopes: string[]): Promise<string> {
        const cacheKey = `token_${scopes.join('_')}`;
        
        try {
            // Try to get token from cache first
            const cachedToken = await cacheService.get<string>(cacheKey);
            if (cachedToken) {
                return cachedToken;
            }

            if (!this.currentAccount) {
                throw new Error('No active account');
            }

            const response = await this.msalInstance.acquireTokenSilent({
                scopes,
                account: this.currentAccount
            });

            // Cache the new token
            await cacheService.set(cacheKey, response.accessToken, 3300); // Cache for 55 minutes (tokens typically valid for 1 hour)
            
            return response.accessToken;
        } catch (error) {
            if (error instanceof Error && error.message.includes('interaction_required')) {
                // Token expired or requires interaction, try interactive sign-in
                const response = await this.msalInstance.acquireTokenPopup({ scopes });
                await cacheService.set(cacheKey, response.accessToken, 3300);
                return response.accessToken;
            }
            
            trackException(error as Error, { operation: 'acquire_token', scopes: scopes.join(',') });
            throw error;
        }
    }

    getAccount(): AccountInfo | null {
        return this.currentAccount;
    }

    isAuthenticated(): boolean {
        return this.currentAccount !== null;
    }
}

export const authService = AuthService.getInstance();