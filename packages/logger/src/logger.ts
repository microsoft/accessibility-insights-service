import { injectable } from 'inversify';

import { VError } from 'verror';
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { LoggerClient } from './logger-client';

export enum LogLevel {
    info,
    warn,
    verbose,
    error,
}

@injectable()
export class Logger {
    private initialized: boolean = false;
    private isDebugEnabled: boolean = false;

    constructor(private readonly loggerClients: LoggerClient[], private readonly currentProcess: typeof process) {}

    public setup(baseProperties?: BaseTelemetryProperties): void {
        if (this.initialized === true) {
            return;
        }

        this.invokeLoggerClient(client => client.setup(baseProperties));

        this.isDebugEnabled = this.currentProcess.execArgv.filter(arg => arg.toLocaleLowerCase() === '--debug').length > 0;

        this.initialized = true;
    }

    public trackMetric(name: string, value: number = 1): void {
        this.ensureInitialized();

        this.invokeLoggerClient(client => client.trackMetric(name, value));
    }

    public trackEvent(name: string, properties?: { [name: string]: string }): void {
        this.ensureInitialized();

        this.invokeLoggerClient(client => client.trackEvent(name, properties));
    }

    public log(message: string, logLevel: LogLevel, properties?: { [name: string]: string }): void {
        this.ensureInitialized();

        this.invokeLoggerClient(client => client.log(message, logLevel, properties));
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

    public trackException(error: Error): void {
        this.ensureInitialized();
        this.invokeLoggerClient(client => client.trackException(error));
    }

    // tslint:disable-next-line: no-any
    public trackExceptionAny(underlyingErrorData: any | Error, message: string): void {
        const parsedErrorObject = underlyingErrorData instanceof Error ? underlyingErrorData : { info: { error: underlyingErrorData } };

        this.trackException(new VError(parsedErrorObject, message));
    }

    public flush(): void {
        this.ensureInitialized();

        this.invokeLoggerClient(client => client.flush());
    }

    private invokeLoggerClient(action: (loggerClient: LoggerClient) => void): void {
        this.loggerClients.forEach(client => {
            action(client);
        });
    }

    private ensureInitialized(): void {
        if (this.initialized === true) {
            return;
        }

        throw new Error('Logger not setup');
    }
}
