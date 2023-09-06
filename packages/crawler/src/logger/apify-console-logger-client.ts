// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { Log } from '@apify/log';
import moment from 'moment';
import { LogLevel, LoggerClient, LoggerProperties } from './logger';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class ApifyConsoleLoggerClient implements LoggerClient {
    private baseProperties: LoggerProperties;

    constructor(private readonly logger: Log = new Log({ prefix: 'Crawler' })) {}

    public log(message: string, logLevel: LogLevel, properties?: LoggerProperties): void {
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

    public setCommonProperties(properties: LoggerProperties): void {
        this.baseProperties = { ...this.baseProperties, ...properties };
    }

    private getProperties(properties: LoggerProperties): Record<string, any> {
        return { ...this.baseProperties, ...properties };
    }
}
