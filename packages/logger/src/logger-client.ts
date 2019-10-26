// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { LogLevel } from './logger';
import { LoggerEvent } from './logger-event';
import { TelemetryMeasurements } from './logger-event-measurements';
import { LoggerMetric } from './logger-metric';
import { LoggerProperties } from './logger-properties';

export interface LoggerClient {
    setup(baseProperties?: BaseTelemetryProperties): Promise<void>;
    trackMetric(name: LoggerMetric, value: number, properties?: { [name: string]: string }): void;
    trackEvent(name: LoggerEvent, properties?: { [key: string]: string }, measurements?: TelemetryMeasurements[LoggerEvent]): void;
    log(message: string, logLevel: LogLevel, properties?: { [name: string]: string }): void;
    trackException(error: Error): void;
    flush(): void;
    setCustomProperties(properties: LoggerProperties): void;
}
