// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';

import * as appInsights from 'applicationinsights';
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { LogLevel } from './logger';
import { LoggerClient } from './logger-client';
import { LoggerEvent } from './logger-event';
import { loggerTypes } from './logger-types';

@injectable()
export class AppInsightsLoggerClient implements LoggerClient {
    constructor(
        @inject(loggerTypes.AppInsights) private readonly appInsightsObject: typeof appInsights,
        @inject(loggerTypes.Process) private readonly currentProcess: typeof process,
    ) {}

    public async setup(baseProperties?: BaseTelemetryProperties): Promise<void> {
        this.appInsightsObject
            .setup()
            .setAutoCollectConsole(true)
            .setAutoCollectExceptions(true)
            .setAutoCollectRequests(true)
            .setAutoCollectDependencies(true)
            .setAutoDependencyCorrelation(true);

        // this should be set after calling setup
        this.appInsightsObject.defaultClient.commonProperties = {
            batchPoolId: this.currentProcess.env.AZ_BATCH_POOL_ID,
            batchJobId: this.currentProcess.env.AZ_BATCH_JOB_ID,
            batchTaskId: this.currentProcess.env.AZ_BATCH_TASK_ID,
            batchNodeId: this.currentProcess.env.AZ_BATCH_NODE_ID,
            ...baseProperties,
        };

        this.appInsightsObject.start();
    }

    public trackMetric(name: string, value: number): void {
        this.appInsightsObject.defaultClient.trackMetric({ name: name, value: value });
    }

    public trackEvent(name: LoggerEvent, properties?: { [name: string]: string }): void {
        this.appInsightsObject.defaultClient.trackEvent({ name: name, properties: properties });
    }

    public log(message: string, logLevel: LogLevel, properties?: { [name: string]: string }): void {
        const severity = this.getAppInsightsSeverityLevel(logLevel);

        this.appInsightsObject.defaultClient.trackTrace({ message: message, severity: severity, properties: properties });
    }

    public trackException(error: Error): void {
        this.appInsightsObject.defaultClient.trackException({ exception: error });
    }

    public flush(): void {
        this.appInsightsObject.defaultClient.flush();
    }

    private getAppInsightsSeverityLevel(logLevel: LogLevel): appInsights.Contracts.SeverityLevel {
        switch (logLevel) {
            case LogLevel.info:
                return appInsights.Contracts.SeverityLevel.Information;

            case LogLevel.error:
                return appInsights.Contracts.SeverityLevel.Error;

            case LogLevel.verbose:
                return appInsights.Contracts.SeverityLevel.Verbose;

            case LogLevel.warn:
                return appInsights.Contracts.SeverityLevel.Warning;

            default:
                throw new Error(`unknown log level ${logLevel}`);
        }
    }
}
