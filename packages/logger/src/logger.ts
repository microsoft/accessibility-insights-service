// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { System } from 'common';
import { AvailabilityTelemetry, LoggerClient, LoggerProperties } from './logger-client';
import { LoggerEvent } from './logger-event';
import { TelemetryMeasurements } from './logger-event-measurements';

export enum LogLevel {
    Info,
    Warn,
    Verbose,
    Error,
}

export abstract class Logger {
    public initialized: boolean = false;

    protected readonly defaultClientInitializationTimeout: number = 5000;

    protected isDebugEnabled: boolean = false;

    constructor(public readonly loggerClients: LoggerClient[]) {}

    public async setup(baseProperties?: LoggerProperties): Promise<void> {
        if (this.initialized === true) {
            return;
        }

        await this.initializeClients(baseProperties);
        this.isDebugEnabled = System.isDebugEnabled();
        this.initialized = true;
    }

    public setCommonProperties(properties: LoggerProperties): void {
        this.ensureInitialized();
        this.invokeLoggerClient((client) => client.setCommonProperties(properties));
    }

    public trackMetric(name: string, value: number = 1): void {
        this.ensureInitialized();
        this.invokeLoggerClient((client) => client.trackMetric(name, value));
    }

    public trackEvent(name: LoggerEvent, properties?: LoggerProperties, measurements?: TelemetryMeasurements[LoggerEvent]): void {
        this.ensureInitialized();
        this.invokeLoggerClient((client) => client.trackEvent(name, properties, measurements));
    }

    public trackAvailability(name: string, telemetry: AvailabilityTelemetry): void {
        this.ensureInitialized();
        this.invokeLoggerClient((client) => client.trackAvailability(name, telemetry));
    }

    public trackException(error: Error): void {
        this.ensureInitialized();
        this.invokeLoggerClient((client) => client.trackException(error));
    }

    public log(message: string, logLevel: LogLevel, properties?: LoggerProperties): void {
        this.ensureInitialized();
        this.invokeLoggerClient((client) => client.log(message, logLevel, properties));
    }

    public logInfo(message: string, properties?: LoggerProperties): void {
        this.log(message, LogLevel.Info, properties);
    }

    public logVerbose(message: string, properties?: LoggerProperties): void {
        if (this.isDebugEnabled) {
            this.log(message, LogLevel.Verbose, properties);
        }
    }

    public logWarn(message: string, properties?: LoggerProperties): void {
        this.log(message, LogLevel.Warn, properties);
    }

    public logError(message: string, properties?: LoggerProperties): void {
        this.log(message, LogLevel.Error, properties);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public trackExceptionAny(underlyingErrorData: any | Error, message: string): void {
        this.trackException(new Error(`${message} ${System.serializeError(underlyingErrorData)}`));
    }

    public async flush(): Promise<void> {
        this.ensureInitialized();
        await this.invokeLoggerClientAsync(async (client) => client.flush());
    }

    private invokeLoggerClient(action: (loggerClient: LoggerClient) => void): void {
        this.loggerClients.map(action);
    }

    private async invokeLoggerClientAsync(action: (loggerClient: LoggerClient) => Promise<void>): Promise<void> {
        await Promise.all(this.loggerClients.map(async (client) => action(client)));
    }

    private async initializeClients(baseProperties?: LoggerProperties): Promise<void> {
        const initClientFn = async (client: LoggerClient) => {
            const timeout = client.initializationTimeout ?? this.defaultClientInitializationTimeout;
            await Promise.race([client.setup(baseProperties), System.wait(timeout)]);
        };

        await this.invokeLoggerClientAsync(initClientFn);

        if (this.loggerClients.some((client) => !client.initialized)) {
            throw new Error(
                `Failed to initialize logger clients: ${this.loggerClients
                    .filter((client) => !client.initialized)
                    .map((client) => client?.constructor.name)
                    .join(', ')}`,
            );
        }
    }

    private ensureInitialized(): void {
        if (this.initialized === true) {
            return;
        }

        throw new Error(
            `The logger instance is not initialized. Ensure the setup() method is invoked by derived class implementation. ${
                new Error().stack
            }`,
        );
    }
}
