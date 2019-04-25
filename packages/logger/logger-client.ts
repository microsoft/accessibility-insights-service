import { LogLevel } from './logger';

export interface LoggerClient {
    setup(baseProperties?: { [key: string]: string }): void;

    trackMetric(name: string, value: number): void;

    trackEvent(name: string, properties?: { [name: string]: string }): void;

    log(message: string, logLevel: LogLevel, properties?: { [name: string]: string }): void;

    trackException(error: Error): void;

    flush(): void;
}
