// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { KnownSeverityLevel, TelemetryClient } from 'applicationinsights';
import { injectable } from 'inversify';
import { merge } from 'lodash';
import { LogLevel } from './logger';
import { AvailabilityTelemetry, BaseTelemetryProperties, LoggerClient, LoggerProperties } from './logger-client';
import { LoggerEvent } from './logger-event';
import { TelemetryMeasurements } from './logger-event-measurements';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export abstract class BaseAppInsightsLoggerClient implements LoggerClient {
    public initialized: boolean = false;

    protected telemetryClient: TelemetryClient;

    public abstract setup(baseProperties?: BaseTelemetryProperties): Promise<void>;

    public isInitialized(): boolean {
        return this.initialized;
    }

    public trackMetric(name: string, value: number): void {
        this.telemetryClient.trackMetric({
            name: name,
            value: value,
            properties: { ...this.getCommonProperties() },
        });
    }

    public trackEvent(name: LoggerEvent, properties?: LoggerProperties, measurements?: TelemetryMeasurements[LoggerEvent]): void {
        this.telemetryClient.trackEvent({ name: name, properties: merge(this.getCommonProperties(), properties), measurements });
    }

    public log(message: string, logLevel: LogLevel, properties?: LoggerProperties): void {
        const severity = this.getAppInsightsSeverityLevel(logLevel);

        // Workaround for the async nature of the resource attribute collection
        // in the application insights telemetry client
        // The telemetry client does not wait for the async attributes to be collected
        // before sending the telemetry data, which can lead to missing attributes
        // in the telemetry data. This workaround ensures that the telemetry data is
        // sent only after the async attributes have been collected.
        // This is a temporary solution until the application insights telemetry client
        // is updated to handle async attributes correctly.
        // Appears as the following trace error: Accessing resource attributes before async attributes settled
        (async () => {
            const resource = (this.telemetryClient as any)._logApi?._logger?._sharedState?.resource;
            if (resource) {
                await resource.waitForAsyncAttributes();
            }
            this.telemetryClient.trackTrace({
                message: this.setMessageSource(message),
                severity: severity,
                properties: merge(this.getCommonProperties(), this.expandProperties(properties)),
            });
        })().catch((error) => {
            console.error('Error waiting for logger async attributes:', error);
        });
    }

    public trackAvailability(name: string, telemetry: AvailabilityTelemetry): void {
        this.telemetryClient.trackAvailability({
            name: name,
            success: telemetry.success,
            message: telemetry.message,
            duration: telemetry.duration,
            runLocation: telemetry.runLocation,
            id: telemetry.id,
            measurements: telemetry.measurements,
            properties: telemetry.properties,
        });
    }

    public trackException(error: Error): void {
        this.telemetryClient.trackException({ exception: error, properties: { ...this.getCommonProperties() } });
    }

    public async flush(): Promise<void> {
        await this.telemetryClient.flush();
    }

    public setCommonProperties(properties: LoggerProperties): void {
        this.telemetryClient.commonProperties = {
            ...this.telemetryClient.commonProperties,
            ...properties,
        };
    }

    public getCommonProperties(): LoggerProperties {
        return {
            ...this.telemetryClient.commonProperties,
        };
    }

    private setMessageSource(message: string): string {
        const source = this.getCommonProperties().source;

        return source !== undefined ? `[${source}] ${message}` : message;
    }

    private getAppInsightsSeverityLevel(logLevel: LogLevel): KnownSeverityLevel {
        switch (logLevel) {
            case LogLevel.Info:
                return KnownSeverityLevel.Information;

            case LogLevel.Error:
                return KnownSeverityLevel.Error;

            case LogLevel.Verbose:
                return KnownSeverityLevel.Verbose;

            case LogLevel.Warn:
                return KnownSeverityLevel.Warning;

            default:
                throw new Error(`Unknown log level '${logLevel}'`);
        }
    }

    private expandProperties(properties: LoggerProperties): LoggerProperties {
        if (properties === undefined) {
            return properties;
        }

        let loggerProperties = {} as LoggerProperties;
        Object.keys(properties).map((name) => {
            loggerProperties = merge(this.expandProperty(name, properties[name]), loggerProperties);
        });

        return loggerProperties;
    }

    private expandProperty(name: string, value: string): LoggerProperties {
        const maxValueLength = 8192;
        const loggerProperties = {} as LoggerProperties;

        if (value?.length > maxValueLength) {
            const count = Math.ceil(value.length / maxValueLength);
            for (let i = 0, index = 0; i < count; ++i, index += maxValueLength) {
                const part = value.substring(index, index + maxValueLength);
                loggerProperties[`${name}${i}`] = part;
            }
        } else {
            loggerProperties[`${name}`] = value;
        }

        return loggerProperties;
    }
}
