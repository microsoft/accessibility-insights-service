// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as utils from 'util';
import { ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import moment from 'moment';
import { isEmpty } from 'lodash';
import { LogLevel } from './logger';
import { AvailabilityTelemetry, BaseTelemetryProperties, LoggerClient, LoggerProperties } from './logger-client';
import { LoggerEvent } from './logger-event';
import { BaseTelemetryMeasurements, TelemetryMeasurements } from './logger-event-measurements';
import { loggerTypes } from './logger-types';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export abstract class BaseConsoleLoggerClient implements LoggerClient {
    public initialized: boolean = false;

    private isConsoleLogEnabled: boolean;

    private baseProperties?: BaseTelemetryProperties;

    constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(loggerTypes.Console) protected readonly consoleObject: typeof console,
    ) {}

    public async setup(baseProperties?: BaseTelemetryProperties): Promise<void> {
        this.baseProperties = baseProperties;
        this.isConsoleLogEnabled = (await this.serviceConfig.getConfigValue('logConfig')).logInConsole;
        this.initialized = true;
    }

    public trackMetric(name: string, value: number): void {
        this.executeInDebugMode(() => {
            this.logInConsole(`[Metric]`, `${name}: ${value}`, this.getPrintablePropertiesString());
        });
    }

    public trackEvent(name: LoggerEvent, properties?: LoggerProperties, measurements?: TelemetryMeasurements[LoggerEvent]): void {
        this.executeInDebugMode(() => {
            this.logInConsole(
                `[Event][${name}]`,
                this.getPrintableMeasurementsString(measurements),
                this.getPrintablePropertiesString(properties),
            );
        });
    }

    public trackAvailability(name: string, telemetry: AvailabilityTelemetry): void {
        return;
    }

    public log(message: string, logLevel: LogLevel, properties?: LoggerProperties): void {
        this.executeInDebugMode(() => {
            this.logInConsole(`[Trace][${LogLevel[logLevel]}]`, message, this.getPrintablePropertiesString(properties));
        });
    }

    public trackException(error: Error): void {
        this.executeInDebugMode(() => {
            this.logInConsole(`[Exception]`, System.serializeError(error), this.getPrintablePropertiesString());
        });
    }

    public async flush(): Promise<void> {
        return;
    }

    public setCommonProperties(properties: LoggerProperties): void {
        this.baseProperties = { ...this.baseProperties, ...properties };
    }

    public getCommonProperties(): LoggerProperties {
        return this.baseProperties;
    }

    protected abstract getPropertiesToAddToEvent(): LoggerProperties;

    private getPrintablePropertiesString(properties?: LoggerProperties): string {
        const allProperties = { ...this.baseProperties, ...this.getPropertiesToAddToEvent(), ...properties };

        return isEmpty(allProperties) ? '' : `${this.getPrintableString(allProperties)}`;
    }

    private getPrintableMeasurementsString(measurements?: BaseTelemetryMeasurements): string {
        return isEmpty(measurements) ? '' : `${this.getPrintableString(measurements)}`;
    }

    private executeInDebugMode(action: () => void): void {
        if (this.isConsoleLogEnabled) {
            action();
        }
    }

    private getPrintableString(obj: any): string {
        return utils.inspect(obj, { depth: null });
    }

    private logInConsole(tag: string, message: string, properties: string): void {
        this.consoleObject.log(`[${moment.utc().toISOString()}]${tag} ${message}\n${properties}`.trim());
    }
}
