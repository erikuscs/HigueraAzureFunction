import * as appInsights from 'applicationinsights';
import { DefaultAzureCredential } from '@azure/identity';
import { LogAnalyticsClient } from '@azure/monitor-query';

class MonitoringService {
    private static instance: MonitoringService;
    private client: appInsights.TelemetryClient;
    private logAnalyticsClient: LogAnalyticsClient;
    private initialized: boolean = false;

    private constructor() {
        this.initializeAppInsights();
        this.initializeLogAnalytics();
    }

    public static getInstance(): MonitoringService {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService();
        }
        return MonitoringService.instance;
    }

    private initializeAppInsights() {
        if (!this.initialized && process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
            appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
                .setAutoDependencyCorrelation(true)
                .setAutoCollectRequests(true)
                .setAutoCollectPerformance(true)
                .setAutoCollectExceptions(true)
                .setAutoCollectDependencies(true)
                .setAutoCollectConsole(true)
                .setUseDiskRetryCaching(true)
                .setSendLiveMetrics(true)
                .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C);

            appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = "HigueraFunction";
            appInsights.start();
            
            this.client = appInsights.defaultClient;
            this.initialized = true;
        }
    }

    private initializeLogAnalytics() {
        const credential = new DefaultAzureCredential();
        this.logAnalyticsClient = new LogAnalyticsClient(credential);
    }

    public trackException(error: Error, properties?: { [key: string]: string }) {
        if (this.initialized) {
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
        }
    }

    public trackEvent(name: string, properties?: { [key: string]: string }) {
        if (this.initialized) {
            const enhancedProperties = {
                ...properties,
                timestamp: new Date().toISOString(),
                environment: process.env.AZURE_ENVIRONMENT || 'development'
            };

            this.client.trackEvent({
                name,
                properties: enhancedProperties
            });
        }
    }

    public trackMetric(name: string, value: number, properties?: { [key: string]: string }) {
        if (this.initialized) {
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
        }
    }

    public trackRequest(name: string, url: string, duration: number, success: boolean, properties?: { [key: string]: string }) {
        if (this.initialized) {
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
        }
    }

    public trackDependency(name: string, data: string, duration: number, success: boolean, properties?: { [key: string]: string }) {
        if (this.initialized) {
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
        }
    }

    public async queryLogs(query: string, timeRange: { start: Date; end: Date }) {
        if (!this.logAnalyticsClient) return null;

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
            this.trackException(error as Error, { operation: 'queryLogs' });
            throw error;
        }
    }

    public startOperation(name: string): appInsights.Contracts.OperationContract {
        if (this.initialized) {
            return this.client.startOperation({ name });
        }
        return null;
    }

    public stopOperation(operation: appInsights.Contracts.OperationContract) {
        if (this.initialized && operation) {
            this.client.stopOperation(operation);
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

export const stopOperation = (operation: appInsights.Contracts.OperationContract) => 
    monitoringService.stopOperation(operation);