// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { LogLevel } from './logger';
import { LoggerEvent } from './logger-event';
import { BaseTelemetryMeasurements } from './logger-event-measurements';

export interface LoggerClient {
    setup(baseProperties?: BaseTelemetryProperties): Promise<void>;
    trackMetric(name: string, value: number): void;
    trackEvent(name: LoggerEvent, properties?: { [key: string]: string }, measurements?: BaseTelemetryMeasurements): void;
    log(message: string, logLevel: LogLevel, properties?: { [name: string]: string }): void;
    trackException(error: Error): void;
    flush(): void;
}
