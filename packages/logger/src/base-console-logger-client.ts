// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import * as utils from 'util';

import { AvailabilityTelemetry } from './availablity-telemetry';
import { LogLevel } from './logger';
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { LoggerClient } from './logger-client';
import { LoggerEvent } from './logger-event';
import { BaseTelemetryMeasurements, TelemetryMeasurements } from './logger-event-measurements';
import { LoggerProperties } from './logger-properties';
import { loggerTypes } from './logger-types';

@injectable()
export abstract class BaseConsoleLoggerClient implements LoggerClient {
    private isConsoleLogEnabled: boolean;
    private baseProperties?: BaseTelemetryProperties;

    constructor(
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(loggerTypes.Console) private readonly consoleObject: typeof console,
    ) {}

    public async setup(baseProperties?: BaseTelemetryProperties): Promise<void> {
        this.baseProperties = baseProperties;

        this.isConsoleLogEnabled = (await this.serviceConfig.getConfigValue('logConfig')).logInConsole;
    }

    public trackMetric(name: string, value: number): void {
        this.executeInDebugMode(() => {
            this.logInConsole(`[Metric]${this.getPrintablePropertiesString()}`, `${name} - ${value}`);
        });
    }

    public trackEvent(name: LoggerEvent, properties?: { [name: string]: string }, measurements?: TelemetryMeasurements[LoggerEvent]): void {
        this.executeInDebugMode(() => {
            this.logInConsole(
                `[Event]${this.getPrintablePropertiesString(properties)}${this.getPrintableMeasurementsString(measurements)}`,
                name,
            );
        });
    }

    // tslint:disable-next-line: no-empty
    public trackAvailability(name: string, telemetry: AvailabilityTelemetry): void {}

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

    public setCustomProperties(properties: LoggerProperties): void {
        this.baseProperties = { ...this.baseProperties, ...properties };
    }

    public getDefaultProperties(): { [name: string]: string } {
        return this.baseProperties;
    }

    protected abstract getPropertiesToAddToEvent(): { [name: string]: string };

    private getPrintablePropertiesString(properties?: { [name: string]: string }): string {
        const allProperties = { ...this.baseProperties, ...this.getPropertiesToAddToEvent(), ...properties };

        return _.isEmpty(allProperties) ? '' : `[properties - ${this.getPrintableString(allProperties)}]`;
    }

    private getPrintableMeasurementsString(measurements?: BaseTelemetryMeasurements): string {
        return _.isEmpty(measurements) ? '' : `[measurements - ${this.getPrintableString(measurements)}]`;
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
