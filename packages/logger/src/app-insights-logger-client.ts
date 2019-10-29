// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as appInsights from 'applicationinsights';
import { inject, injectable } from 'inversify';

import { AvailabilityTelemetry } from './availablity-telemetry';
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { LogLevel } from './logger';
import { LoggerClient } from './logger-client';
import { LoggerEvent } from './logger-event';
import { TelemetryMeasurements } from './logger-event-measurements';
import { LoggerProperties } from './logger-properties';
import { loggerTypes } from './logger-types';

@injectable()
export class AppInsightsLoggerClient implements LoggerClient {
    private customProperties: LoggerProperties;

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
        this.appInsightsObject.defaultClient.trackMetric({
            name: name,
            value: value,
            properties: { ...this.customProperties },
        });
    }

    public trackAvailability(name: string, telemetry: AvailabilityTelemetry): void {
        const availabilityTelemetry = new appInsights.Contracts.AvailabilityData();

        availabilityTelemetry.id = telemetry.id;
        availabilityTelemetry.name = name;
        availabilityTelemetry.duration = telemetry.duration;
        availabilityTelemetry.runLocation = telemetry.runLocation;
        availabilityTelemetry.message = telemetry.message;
        availabilityTelemetry.measurements = telemetry.measurements;
        availabilityTelemetry.properties = telemetry.properties;

        const availabilityData = new appInsights.Contracts.Data();
        availabilityData.baseData = availabilityTelemetry;
        // tslint:disable-next-line: no-any
        availabilityData.baseType = this.appInsightsObject.Contracts.telemetryTypeToBaseType('AvailabilityData' as any);

        const availabilityEnvelope = new appInsights.Contracts.Envelope();
        availabilityEnvelope.data = availabilityData;
        availabilityEnvelope.time = new Date().toISOString();
        availabilityEnvelope.ver = 1;
        availabilityEnvelope.iKey = this.appInsightsObject.defaultClient.config.instrumentationKey;
        availabilityEnvelope.name = 'Microsoft.ApplicationInsights.Availability';

        this.appInsightsObject.defaultClient.channel.send(availabilityEnvelope);
    }

    public trackEvent(name: LoggerEvent, properties?: { [name: string]: string }, measurements?: TelemetryMeasurements[LoggerEvent]): void {
        this.appInsightsObject.defaultClient.trackEvent({ name: name, properties: this.getMergedProperties(properties), measurements });
    }

    public log(message: string, logLevel: LogLevel, properties?: { [name: string]: string }): void {
        const severity = this.getAppInsightsSeverityLevel(logLevel);

        this.appInsightsObject.defaultClient.trackTrace({
            message: message,
            severity: severity,
            properties: this.getMergedProperties(properties),
        });
    }

    public trackException(error: Error): void {
        this.appInsightsObject.defaultClient.trackException({ exception: error, properties: { ...this.customProperties } });
    }

    public flush(): void {
        this.appInsightsObject.defaultClient.flush();
    }

    public setCustomProperties(properties: { [key: string]: string }): void {
        this.customProperties = this.getMergedProperties(properties);
    }

    private getMergedProperties(properties?: { [key: string]: string }): { [key: string]: string } {
        if (properties === undefined) {
            return { ...this.customProperties };
        }

        return { ...this.customProperties, ...properties };
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
