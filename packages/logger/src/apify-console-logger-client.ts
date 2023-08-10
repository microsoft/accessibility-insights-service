// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as utils from 'util';
import { System } from 'common';
import { injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { Log } from '@apify/log';
import moment from 'moment';
import { AvailabilityTelemetry } from './availability-telemetry';
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { LogLevel } from './logger';
import { LoggerClient } from './logger-client';
import { LoggerEvent } from './logger-event';
import { TelemetryMeasurements } from './logger-event-measurements';
import { LoggerProperties } from './logger-properties';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class ApifyConsoleLoggerClient implements LoggerClient {
    public initialized = true;

    private baseProperties: BaseTelemetryProperties;

    constructor(private readonly logger: Log = new Log({ prefix: 'Scanner' })) {}

    public async setup(baseProperties?: BaseTelemetryProperties): Promise<void> {
        this.baseProperties = baseProperties;
    }

    public trackMetric(name: string, value: number): void {
        this.logger.info(`[${moment.utc().toISOString()}] Metric ${name}: ${value}`, this.baseProperties);
    }

    public trackEvent(name: LoggerEvent, properties?: { [name: string]: string }, measurements?: TelemetryMeasurements[LoggerEvent]): void {
        const message = isEmpty(measurements) ? '' : ` ${utils.inspect(measurements, { depth: null })}`;
        this.logger.info(`[${moment.utc().toISOString()}] Event ${name}${message}`, this.getProperties(properties));
    }

    public trackAvailability(name: string, telemetry: AvailabilityTelemetry): void {
        return;
    }

    public log(message: string, logLevel: LogLevel, properties?: { [name: string]: string }): void {
        const logMessage = `[${moment.utc().toISOString()}] ${message}`;
        switch (logLevel) {
            case LogLevel.Error:
                this.logger.error(logMessage, this.getProperties(properties));
                break;
            case LogLevel.Info:
                this.logger.info(logMessage, this.getProperties(properties));
                break;
            case LogLevel.Verbose:
                this.logger.debug(logMessage, this.getProperties(properties));
                break;
            case LogLevel.Warn:
                this.logger.warning(logMessage, this.getProperties(properties));
                break;
            default:
                this.logger.info(logMessage, this.getProperties(properties));
        }
    }

    public trackException(error: Error): void {
        this.logger.error(`[${moment.utc().toISOString()}] ${System.serializeError(error)}`, this.baseProperties);
    }

    public async flush(): Promise<void> {
        return;
    }

    public setCommonProperties(properties: LoggerProperties): void {
        this.baseProperties = { ...this.baseProperties, ...properties };
    }

    private getProperties(properties: Record<string, any>): Record<string, any> {
        return { ...this.baseProperties, ...properties };
    }
}
