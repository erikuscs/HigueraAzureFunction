// Use dynamic imports for server-only modules
// These modules will only be imported on the server

// Import placeholders for server-side modules
let appInsightsModule: any = null;
let DefaultAzureCredentialClass: any = null;
let LogAnalyticsClientClass: any = null;

// Only import server-side modules when running on the server
if (typeof window === 'undefined') {
  try {
    appInsightsModule = require('applicationinsights');
    const { DefaultAzureCredential } = require('@azure/identity');
    const { LogAnalyticsClient } = require('@azure/monitor-query');
    
    DefaultAzureCredentialClass = DefaultAzureCredential;
    LogAnalyticsClientClass = LogAnalyticsClient;
  } catch (error) {
    console.error('Error importing server-side modules:', error);
  }
}

class MonitoringService {
    private static instance: MonitoringService;
    private client: any;
    private logAnalyticsClient: any;
    private initialized: boolean = false;

    private constructor() {
        if (typeof window === 'undefined') {
            this.initializeAppInsights();
            this.initializeLogAnalytics();
        }
    }

    public static getInstance(): MonitoringService {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService();
        }
        return MonitoringService.instance;
    }

    private initializeAppInsights() {
        if (!this.initialized && process.env.APPLICATIONINSIGHTS_CONNECTION_STRING && appInsightsModule) {
            appInsightsModule.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
                .setAutoDependencyCorrelation(true)
                .setAutoCollectRequests(true)
                .setAutoCollectPerformance(true)
                .setAutoCollectExceptions(true)
                .setAutoCollectDependencies(true)
                .setAutoCollectConsole(true)
                .setUseDiskRetryCaching(true)
                .setSendLiveMetrics(true)
                .setDistributedTracingMode(appInsightsModule.DistributedTracingModes.AI_AND_W3C);

            appInsightsModule.defaultClient.context.tags[appInsightsModule.defaultClient.context.keys.cloudRole] = "HigueraFunction";
            appInsightsModule.start();
            
            this.client = appInsightsModule.defaultClient;
            this.initialized = true;
        }
    }

    private initializeLogAnalytics() {
        if (DefaultAzureCredentialClass && LogAnalyticsClientClass) {
            try {
                const credential = new DefaultAzureCredentialClass();
                this.logAnalyticsClient = new LogAnalyticsClientClass(credential);
            } catch (error) {
                console.error('Error initializing Log Analytics client:', error);
            }
        }
    }

    public trackException(error: Error, properties?: { [key: string]: string }) {
        if (typeof window !== 'undefined' || !this.initialized) {
            return; // Skip on client-side
        }

        try {
            const enhancedProperties = {
                ...properties,
                errorName: error.name,
                stackTrace: error.stack,
                timestamp: new Date().toISOString()
            };

            this.client.trackException({
                exception: error,
                properties: enhancedProperties
            });
        } catch (error) {
            console.error('Error tracking exception:', error);
        }
    }

    public trackEvent(name: string, properties?: { [key: string]: string }) {
        if (typeof window !== 'undefined' || !this.initialized) {
            return; // Skip on client-side
        }

        try {
            const enhancedProperties = {
                ...properties,
                timestamp: new Date().toISOString(),
                environment: process.env.AZURE_ENVIRONMENT || 'development'
            };

            this.client.trackEvent({
                name,
                properties: enhancedProperties
            });
        } catch (error) {
            console.error('Error tracking event:', error);
        }
    }

    public trackMetric(name: string, value: number, properties?: { [key: string]: string }) {
        if (typeof window !== 'undefined' || !this.initialized) {
            return; // Skip on client-side
        }

        try {
            const enhancedProperties = {
                ...properties,
                timestamp: new Date().toISOString(),
                environment: process.env.AZURE_ENVIRONMENT || 'development'
            };

            this.client.trackMetric({
                name,
                value,
                properties: enhancedProperties
            });
        } catch (error) {
            console.error('Error tracking metric:', error);
        }
    }

    public trackRequest(name: string, url: string, duration: number, success: boolean, properties?: { [key: string]: string }) {
        if (typeof window !== 'undefined' || !this.initialized) {
            return; // Skip on client-side
        }

        try {
            const enhancedProperties = {
                ...properties,
                timestamp: new Date().toISOString(),
                environment: process.env.AZURE_ENVIRONMENT || 'development'
            };

            this.client.trackRequest({
                name,
                url,
                duration,
                success,
                properties: enhancedProperties
            });
        } catch (error) {
            console.error('Error tracking request:', error);
        }
    }

    public trackDependency(name: string, data: string, duration: number, success: boolean, properties?: { [key: string]: string }) {
        if (typeof window !== 'undefined' || !this.initialized) {
            return; // Skip on client-side
        }

        try {
            const enhancedProperties = {
                ...properties,
                timestamp: new Date().toISOString(),
                environment: process.env.AZURE_ENVIRONMENT || 'development'
            };

            this.client.trackDependency({
                name,
                data,
                duration,
                success,
                properties: enhancedProperties,
                dependencyTypeName: "HTTP"
            });
        } catch (error) {
            console.error('Error tracking dependency:', error);
        }
    }

    public async queryLogs(query: string, timeRange: { start: Date; end: Date }) {
        if (typeof window !== 'undefined' || !this.logAnalyticsClient) {
            return null; // Skip on client-side
        }

        try {
            const workspaceId = process.env.LOG_ANALYTICS_WORKSPACE_ID;
            if (!workspaceId) {
                throw new Error('LOG_ANALYTICS_WORKSPACE_ID not configured');
            }

            const result = await this.logAnalyticsClient.queryWorkspace(
                workspaceId,
                query,
                { timeRange }
            );

            return result;
        } catch (error) {
            if (this.initialized) {
                this.trackException(error as Error, { operation: 'queryLogs' });
            }
            throw error;
        }
    }

    public startOperation(name: string): any {
        if (typeof window !== 'undefined' || !this.initialized) {
            return null; // Skip on client-side
        }

        try {
            return this.client.startOperation({ name });
        } catch (error) {
            console.error('Error starting operation:', error);
            return null;
        }
    }

    public stopOperation(operation: any) {
        if (typeof window !== 'undefined' || !this.initialized || !operation) {
            return; // Skip on client-side
        }

        try {
            this.client.stopOperation(operation);
        } catch (error) {
            console.error('Error stopping operation:', error);
        }
    }
}

// Export singleton instance methods
const monitoringService = MonitoringService.getInstance();

export const trackException = (error: Error, properties?: { [key: string]: string }) => 
    monitoringService.trackException(error, properties);

export const trackEvent = (name: string, properties?: { [key: string]: string }) => 
    monitoringService.trackEvent(name, properties);

export const trackMetric = (name: string, value: number, properties?: { [key: string]: string }) => 
    monitoringService.trackMetric(name, value, properties);

export const trackRequest = (name: string, url: string, duration: number, success: boolean, properties?: { [key: string]: string }) => 
    monitoringService.trackRequest(name, url, duration, success, properties);

export const trackDependency = (name: string, data: string, duration: number, success: boolean, properties?: { [key: string]: string }) => 
    monitoringService.trackDependency(name, data, duration, success, properties);

export const queryLogs = (query: string, timeRange: { start: Date; end: Date }) => 
    monitoringService.queryLogs(query, timeRange);

export const startOperation = (name: string) => 
    monitoringService.startOperation(name);

export const stopOperation = (operation: any) => 
    monitoringService.stopOperation(operation);