// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { System } from 'common';
import { VError } from 'verror';
import { AvailabilityTelemetry } from './availability-telemetry';
import { LoggerClient } from './logger-client';
import { LoggerEvent } from './logger-event';
import { TelemetryMeasurements } from './logger-event-measurements';
import { LoggerProperties } from './logger-properties';

export enum LogLevel {
    info,
    warn,
    verbose,
    error,
}

export abstract class Logger {
    protected initialized: boolean = false;
    protected isDebugEnabled: boolean = false;

    constructor(
        protected readonly loggerClients: LoggerClient[],
        protected readonly currentProcess: typeof process,
        protected readonly initializationTimeout: number = 5000,
    ) {}

    public async setup(baseProperties?: { [property: string]: string }): Promise<void> {
        if (this.initialized === true) {
            return;
        }

        await this.initializeClients(baseProperties);
        this.isDebugEnabled = /--debug|--inspect/i.test(this.currentProcess.execArgv.join(' '));
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

    public trackEvent(name: LoggerEvent, properties?: { [name: string]: string }, measurements?: TelemetryMeasurements[LoggerEvent]): void {
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

    public log(message: string, logLevel: LogLevel, properties?: { [name: string]: string }): void {
        this.ensureInitialized();
        this.invokeLoggerClient((client) => client.log(message, logLevel, properties));
    }

    public logInfo(message: string, properties?: { [name: string]: string }): void {
        this.log(message, LogLevel.info, properties);
    }

    public logVerbose(message: string, properties?: { [name: string]: string }): void {
        if (this.isDebugEnabled) {
            this.log(message, LogLevel.verbose, properties);
        }
    }

    public logWarn(message: string, properties?: { [name: string]: string }): void {
        this.log(message, LogLevel.warn, properties);
    }

    public logError(message: string, properties?: { [name: string]: string }): void {
        this.log(message, LogLevel.error, properties);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public trackExceptionAny(underlyingErrorData: any | Error, message: string): void {
        const parsedErrorObject =
            underlyingErrorData instanceof Error ? underlyingErrorData : new Error(System.serializeError(underlyingErrorData));
        this.trackException(new VError(parsedErrorObject, message));
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

    private async initializeClients(baseProperties?: { [property: string]: string }): Promise<void> {
        const threshold = new Date().valueOf() + this.initializationTimeout;
        while (this.loggerClients.some((client) => !client.initialized) && new Date().valueOf() <= threshold) {
            this.invokeLoggerClientAsync(async (client) => client.setup(baseProperties));
            await System.wait(100);
        }

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
