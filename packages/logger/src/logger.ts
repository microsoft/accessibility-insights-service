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

    constructor(protected readonly loggerClients: LoggerClient[], protected readonly currentProcess: typeof process) {}

    public async setup(baseProperties?: { [property: string]: string }): Promise<void> {
        if (this.initialized === true) {
            return;
        }

        this.invokeLoggerClient(async (client) => {
            await client.setup(baseProperties);
        });
        this.isDebugEnabled = /--debug|--inspect/i.test(this.currentProcess.execArgv.join(' '));
        this.initialized = true;
    }

    public trackMetric(name: string, value: number = 1): void {
        this.ensureInitialized();

        this.invokeLoggerClient((client) => client.trackMetric(name, value));
    }

    public trackEvent(name: LoggerEvent, properties?: { [name: string]: string }, measurements?: TelemetryMeasurements[LoggerEvent]): void {
        this.ensureInitialized();

        this.invokeLoggerClient((client) => client.trackEvent(name, properties, measurements));
    }

    public log(message: string, logLevel: LogLevel, properties?: { [name: string]: string }): void {
        this.ensureInitialized();

        this.invokeLoggerClient((client) => client.log(message, logLevel, properties));
    }

    public logInfo(message: string, properties?: { [name: string]: string }): void {
        this.log(message, LogLevel.info, properties);
    }

    public trackAvailability(name: string, telemetry: AvailabilityTelemetry): void {
        this.ensureInitialized();
        this.invokeLoggerClient((client) => client.trackAvailability(name, telemetry));
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

    public trackException(error: Error): void {
        this.ensureInitialized();
        this.invokeLoggerClient((client) => client.trackException(error));
    }

    // tslint:disable-next-line: no-any
    public trackExceptionAny(underlyingErrorData: any | Error, message: string): void {
        const parsedErrorObject =
            underlyingErrorData instanceof Error ? underlyingErrorData : new Error(System.serializeError(underlyingErrorData));

        this.trackException(new VError(parsedErrorObject, message));
    }

    public async flush(): Promise<void> {
        this.ensureInitialized();

        const promises = this.invokeLoggerClient((client) => client.flush());
        await Promise.all(promises);
    }

    public setCommonProperties(properties: LoggerProperties): void {
        this.invokeLoggerClient((client) => client.setCommonProperties(properties));
    }

    private invokeLoggerClient<T>(action: (loggerClient: LoggerClient) => T): T[] {
        const results: T[] = [];

        this.loggerClients.forEach((client) => {
            results.push(action(client));
        });

        return results;
    }

    private ensureInitialized(): void {
        if (this.initialized === true) {
            return;
        }

        throw new Error(
            `The logger instance is not initialized. Ensure the setup() method is invoked by derived class implementation. - ${
                new Error().stack
            }`,
        );
    }
}
