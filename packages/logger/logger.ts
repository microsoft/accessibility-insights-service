import * as appInsights from 'applicationinsights';

export class TelemetryClient {
    private initialized: boolean = false;

    constructor(private readonly appInsightsObject: typeof appInsights, private readonly currentProcess: typeof process) {}

    public setup(baseProperties: { [key: string]: string }): void {
        if (this.initialized === true) {
            return;
        }

        this.appInsightsObject
            .setup()
            .setAutoCollectConsole(false)
            .setAutoCollectExceptions(true)
            .setAutoCollectRequests(false);

        // this should be set after calling setup
        this.appInsightsObject.defaultClient.commonProperties = {
            batchPoolId: this.currentProcess.env.AZ_BATCH_POOL_ID,
            batchJobId: this.currentProcess.env.AZ_BATCH_JOB_ID,
            batchTaskId: this.currentProcess.env.AZ_BATCH_TASK_ID,
            batchNodeId: this.currentProcess.env.AZ_BATCH_NODE_ID,
            ...baseProperties,
        };

        this.appInsightsObject.start();
        this.initialized = true;
    }

    public trackMetric(name: string, value: number = 1): void {
        this.ensureInitialized();

        this.appInsightsObject.defaultClient.trackMetric({ name: name, value: value });
    }

    public trackEvent(name: string, properties?: { [name: string]: string }): void {
        this.ensureInitialized();

        this.appInsightsObject.defaultClient.trackEvent({ name: name, properties: properties });
    }

    public trackTrace(message: string, severity: appInsights.Contracts.SeverityLevel, properties?: { [name: string]: string }): void {
        this.ensureInitialized();

        this.appInsightsObject.defaultClient.trackTrace({ message: message, severity: severity, properties: properties });
    }

    public trackInfoTrace(message: string, properties?: { [name: string]: string }): void {
        this.trackTrace(message, appInsights.Contracts.SeverityLevel.Information, properties);
    }

    public flush(): void {
        this.appInsightsObject.defaultClient.flush();
    }

    private ensureInitialized(): void {
        if (this.initialized === true) {
            return;
        }

        throw new Error('Telemetry client not setup');
    }
}
