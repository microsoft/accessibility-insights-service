// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as appInsights from 'applicationinsights';
import * as dotenv from 'dotenv';
import { Container } from 'inversify';
import { AppInsightsLoggerClient } from './app-insights-logger-client';
import { ConsoleLoggerClient } from './console-logger-client';
import { GlobalLogger } from './global-logger';
import { LoggerClient } from './logger-client';
import { loggerTypes } from './logger-types';
import { registerLoggerToContainer } from './register-logger-to-container';
import { OTelLoggerClient } from './otel-logger-client';

/* eslint-disable @typescript-eslint/no-explicit-any */

let container: Container;

describe('registerGlobalLoggerToContainer', () => {
    beforeEach(() => {
        container = new Container({ autoBindInjectable: true });
    });

    it('verify logger dependency resolution', () => {
        registerLoggerToContainer(container);

        expect(container.get(loggerTypes.AppInsights)).toStrictEqual(appInsights);
        expect(container.get(loggerTypes.Console)).toStrictEqual(console);
        expect(container.get(loggerTypes.DotEnvConfig)).toStrictEqual(dotenv.config());

        verifySingletonDependencyResolution(AppInsightsLoggerClient);
        verifySingletonDependencyResolution(ConsoleLoggerClient);
        verifySingletonDependencyResolution(loggerTypes.DotEnvConfig);
        verifySingletonDependencyResolution(OTelLoggerClient);
    });

    it('verify GlobalLogger resolution', () => {
        registerLoggerToContainer(container);

        const logger = container.get(GlobalLogger);

        const telemetryClients = (logger as any).loggerClients as LoggerClient[];
        expect(telemetryClients.filter((c) => c instanceof AppInsightsLoggerClient)).toHaveLength(1);
        expect(telemetryClients.filter((c) => c instanceof ConsoleLoggerClient)).toHaveLength(1);
        expect(telemetryClients.filter((c) => c instanceof OTelLoggerClient)).toHaveLength(1);
    });
});

function verifySingletonDependencyResolution(key: any, testContainer: Container = container): void {
    expect(testContainer.get(key)).toBeDefined();
    expect(testContainer.get(key)).toBe(testContainer.get(key));
}
