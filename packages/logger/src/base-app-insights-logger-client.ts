// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Contracts, TelemetryClient } from 'applicationinsights';
import { injectable } from 'inversify';
import { BaseTelemetryProperties, TelemetryMeasurements } from '.';
import { AvailabilityTelemetry } from './availablity-telemetry';
import { LogLevel } from './base-logger';
import { LoggerClient } from './logger-client';
import { LoggerEvent } from './logger-event';

@injectable()
export abstract class BaseAppInsightsLoggerClient implements LoggerClient {
    protected telemetryClient: TelemetryClient;

    public abstract async setup(baseProperties?: BaseTelemetryProperties): Promise<void>;

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
        const availabilityTelemetry = new Contracts.AvailabilityData();

        availabilityTelemetry.id = telemetry.id;
        availabilityTelemetry.name = name;
        availabilityTelemetry.success = telemetry.success;
        availabilityTelemetry.duration = telemetry.duration;
        availabilityTelemetry.runLocation = telemetry.runLocation;
        availabilityTelemetry.message = telemetry.message;
        availabilityTelemetry.measurements = telemetry.measurements;
        availabilityTelemetry.properties = this.getMergedProperties(telemetry.properties);

        const availabilityData = new Contracts.Data();
        availabilityData.baseData = availabilityTelemetry;
        // tslint:disable-next-line: no-any
        availabilityData.baseType = 'AvailabilityData';

        const availabilityEnvelope = new Contracts.Envelope();
        availabilityEnvelope.data = availabilityData;
        availabilityEnvelope.time = new Date().toISOString();
        availabilityEnvelope.ver = 1;
        availabilityEnvelope.iKey = this.telemetryClient.config.instrumentationKey;
        availabilityEnvelope.name = 'Microsoft.ApplicationInsights.Availability';

        this.telemetryClient.channel.send(availabilityEnvelope);
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
