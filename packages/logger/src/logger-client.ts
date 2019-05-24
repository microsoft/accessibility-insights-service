// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { LogLevel } from './logger';

export interface LoggerClient {
    setup(baseProperties?: BaseTelemetryProperties): void;

    trackMetric(name: string, value: number): void;

    trackEvent(name: string, properties?: { [name: string]: string }): void;

    log(message: string, logLevel: LogLevel, properties?: { [name: string]: string }): void;

    trackException(error: Error): void;

    flush(): void;
}
