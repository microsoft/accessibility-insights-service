// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { LogLevel } from './logger';
import { LoggerEvent } from './logger-event';
import { TelemetryMeasurements } from './logger-event-measurements';

export interface LoggerProperties {
    [name: string]: string;
}

export interface BaseTelemetryProperties extends LoggerProperties {
    source: string;
}

export type AvailabilityTelemetry = {
    id?: string;
    duration?: number;
    success: boolean;
    runLocation?: string;
    message?: string;
    measurements?: { [key: string]: number };
    properties?: { [key: string]: string };
};

export interface LoggerClient {
    setup(baseProperties?: LoggerProperties): Promise<void>;
    trackMetric(name: string, value: number): void;
    trackEvent(name: LoggerEvent, properties?: LoggerProperties, measurements?: TelemetryMeasurements[LoggerEvent]): void;
    trackAvailability(name: string, telemetry: AvailabilityTelemetry): void;
    log(message: string, logLevel: LogLevel, properties?: LoggerProperties): void;
    trackException(error: Error): void;
    flush(): Promise<void>;
    setCommonProperties(properties: LoggerProperties): void;
    initialized: boolean;
    initializationTimeout?: number;
}
