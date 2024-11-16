// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable, optional } from 'inversify';
import { ApifyConsoleLoggerClient } from './apify-console-logger-client';

export enum LogLevel {
    Info,
    Warn,
    Verbose,
    Error,
}

export interface LoggerProperties {
    [name: string]: string;
}

export interface LoggerClient {
    log(message: string, logLevel: LogLevel, properties?: LoggerProperties): void;
    setCommonProperties(properties: LoggerProperties): void;
}

@injectable()
export class Logger {
    constructor(@optional() @inject('LoggerClient') private readonly loggerClients: LoggerClient[] = [new ApifyConsoleLoggerClient()]) {}

    public setCommonProperties(properties: LoggerProperties): void {
        this.invokeLoggerClients((client) => client.setCommonProperties(properties));
    }

    public log(message: string, logLevel: LogLevel, properties?: LoggerProperties): void {
        this.invokeLoggerClients((client) => client.log(message, logLevel, properties));
    }

    public logInfo(message: string, properties?: LoggerProperties): void {
        this.log(message, LogLevel.Info, properties);
    }

    public logVerbose(message: string, properties?: LoggerProperties): void {
        this.log(message, LogLevel.Verbose, properties);
    }

    public logWarn(message: string, properties?: LoggerProperties): void {
        this.log(message, LogLevel.Warn, properties);
    }

    public logError(message: string, properties?: LoggerProperties): void {
        this.log(message, LogLevel.Error, properties);
    }

    private invokeLoggerClients(action: (loggerClient: LoggerClient) => void): void {
        this.loggerClients.map(action);
    }
}
