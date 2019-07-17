// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';

import { ServiceConfiguration } from 'common';
import * as _ from 'lodash';
import * as utils from 'util';
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { LogLevel } from './logger';
import { LoggerClient } from './logger-client';
import { loggerTypes } from './logger-types';

@injectable()
export class ConsoleLoggerClient implements LoggerClient {
    private isConsoleLogEnabled: boolean;
    private baseProperties?: { [key: string]: string };

    constructor(
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(loggerTypes.Console) private readonly consoleObject: typeof console,
    ) {}

    public async setup(baseProperties?: BaseTelemetryProperties): Promise<void> {
        this.baseProperties = baseProperties;

        this.isConsoleLogEnabled = await this.serviceConfig.getConfigValue('logInConsole');
    }

    public trackMetric(name: string, value: number): void {
        this.executeInDebugMode(() => {
            this.logInConsole(`[Metric]${this.getPrintablePropertiesString()}`, `${name} - ${value}`);
        });
    }

    public trackEvent(name: string, properties?: { [name: string]: string }): void {
        this.executeInDebugMode(() => {
            this.logInConsole(`[Event]${this.getPrintablePropertiesString(properties)}`, name);
        });
    }

    public log(message: string, logLevel: LogLevel, properties?: { [name: string]: string }): void {
        this.executeInDebugMode(() => {
            this.logInConsole(`[Trace][${LogLevel[logLevel]}]${this.getPrintablePropertiesString(properties)}`, message);
        });
    }

    public trackException(error: Error): void {
        this.executeInDebugMode(() => {
            this.logInConsole(`[Exception]${this.getPrintablePropertiesString()}`, this.getPrintableString(error));
        });
    }

    // tslint:disable-next-line: no-empty
    public flush(): void {}

    private getPrintablePropertiesString(properties?: { [name: string]: string }): string {
        // tslint:disable-next-line: no-null-keyword
        const allProperties = { ...this.baseProperties, ...properties };

        return _.isEmpty(allProperties) ? '' : `[properties - ${this.getPrintableString(allProperties)}]`;
    }

    private executeInDebugMode(action: () => void): void {
        if (this.isConsoleLogEnabled) {
            action();
        }
    }

    // tslint:disable-next-line: no-any
    private getPrintableString(obj: any): string {
        // tslint:disable-next-line: no-null-keyword
        return utils.inspect(obj, { depth: null });
    }

    private logInConsole(tag: string, content: string): void {
        this.consoleObject.log(`${tag} === ${content}`);
    }
}
