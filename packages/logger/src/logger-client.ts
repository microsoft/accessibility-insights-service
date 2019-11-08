// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AvailabilityTelemetry } from './availablity-telemetry';
import { LogLevel } from './base-logger';
import { LoggerEvent } from './logger-event';
import { TelemetryMeasurements } from './logger-event-measurements';
import { LoggerProperties } from './logger-properties';

export interface LoggerClient {
    setup(baseProperties?: { [index: string]: string }): Promise<void>;
    trackMetric(name: string, value: number): void;
    trackEvent(name: LoggerEvent, properties?: { [key: string]: string }, measurements?: TelemetryMeasurements[LoggerEvent]): void;
    trackAvailability(name: string, telemetry: AvailabilityTelemetry): void;
    log(message: string, logLevel: LogLevel, properties?: { [name: string]: string }): void;
    trackException(error: Error): void;
    flush(): void;
    setCustomProperties(properties: LoggerProperties): void;
}
