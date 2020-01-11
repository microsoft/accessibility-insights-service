// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Contracts, TelemetryClient } from 'applicationinsights';
import { injectable } from 'inversify';
import { BaseTelemetryProperties, TelemetryMeasurements } from '.';
import { AvailabilityTelemetry } from './availability-telemetry';
import { LogLevel } from './logger';
import { LoggerClient } from './logger-client';
import { LoggerEvent } from './logger-event';

@injectable()
export abstract class BaseAppInsightsLoggerClient implements LoggerClient {
    protected telemetryClient: TelemetryClient;

    protected initialized: boolean = false;

    public abstract async setup(baseProperties?: BaseTelemetryProperties): Promise<void>;

    public isInitialized(): boolean {
        return this.initialized;
    }

    public trackMetric(name: string, value: number): void {
        this.telemetryClient.trackMetric({
            name: name,
            value: value,
            properties: { ...this.getAdditionalPropertiesToAddToEvent() },
        });
    }

    public trackEvent(name: LoggerEvent, properties?: { [name: string]: string }, measurements?: TelemetryMeasurements[LoggerEvent]): void {
        this.telemetryClient.trackEvent({ name: name, properties: this.getMergedProperties(properties), measurements });
    }

    public log(message: string, logLevel: LogLevel, properties?: { [name: string]: string }): void {
        const severity = this.getAppInsightsSeverityLevel(logLevel);

        this.telemetryClient.trackTrace({
            message: message,
            severity: severity,
            properties: this.getMergedProperties(properties),
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
        this.telemetryClient.trackException({ exception: error, properties: { ...this.getAdditionalPropertiesToAddToEvent() } });
    }

    public flush(): void {
        this.telemetryClient.flush();
    }

    public setCustomProperties(properties: { [key: string]: string }): void {
        this.telemetryClient.commonProperties = {
            ...this.telemetryClient.commonProperties,
            ...properties,
        };
    }

    public getDefaultProperties(): { [key: string]: string } {
        return {
            ...this.telemetryClient.commonProperties,
        };
    }

    protected abstract getAdditionalPropertiesToAddToEvent(): { [key: string]: string };

    private getMergedProperties(properties?: { [key: string]: string }): { [key: string]: string } {
        if (properties === undefined) {
            return { ...this.getAdditionalPropertiesToAddToEvent() };
        }

        return { ...this.getAdditionalPropertiesToAddToEvent(), ...properties };
    }

    private getAppInsightsSeverityLevel(logLevel: LogLevel): Contracts.SeverityLevel {
        switch (logLevel) {
            case LogLevel.info:
                return Contracts.SeverityLevel.Information;

            case LogLevel.error:
                return Contracts.SeverityLevel.Error;

            case LogLevel.verbose:
                return Contracts.SeverityLevel.Verbose;

            case LogLevel.warn:
                return Contracts.SeverityLevel.Warning;

            default:
                throw new Error(`unknown log level ${logLevel}`);
        }
    }
}
