// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as appInsights from 'applicationinsights';
import * as dotenv from 'dotenv';
import { Container } from 'inversify';
import * as argv from 'yargs';
import { AppInsightsLoggerClient } from './app-insights-logger-client';
import { ConsoleLoggerClient } from './console-logger-client';
import { ContextAwareAppInsightsLoggerClient } from './context-aware-app-insights-logger-client';
import { ContextAwareConsoleLoggerClient } from './context-aware-console-logger-client';
import { ContextAwareLogger } from './context-aware-logger';
import { Logger } from './logger';
import { LoggerClient } from './logger-client';
import { loggerTypes } from './logger-types';
import { registerLoggerToContainer } from './register-logger-to-container';

// tslint:disable: no-unsafe-any no-any

describe(registerLoggerToContainer, () => {
    let container: Container;

    beforeEach(() => {
        container = new Container({ autoBindInjectable: true });
    });

    it('verify logger dependency resolution', () => {
        registerLoggerToContainer(container);

        expect(container.get(loggerTypes.AppInsights)).toBe(appInsights);
        expect(container.get(loggerTypes.Process)).toBe(process);
        expect(container.get(loggerTypes.Console)).toBe(console);
        expect(container.get(loggerTypes.Argv)).toBe(argv);
        expect(container.get(loggerTypes.DotEnvConfig)).toEqual(dotenv.config());

        verifySingletonDependencyResolution(AppInsightsLoggerClient);
        verifySingletonDependencyResolution(ConsoleLoggerClient);
        verifySingletonDependencyResolution(loggerTypes.DotEnvConfig);

        verifyNonSingletonDependencyResolution(ContextAwareAppInsightsLoggerClient);
        verifyNonSingletonDependencyResolution(ContextAwareConsoleLoggerClient);
    });

    it('verify logger resolution', () => {
        registerLoggerToContainer(container);

        const logger = container.get(Logger);

        verifySingletonDependencyResolution(Logger);

        const telemetryClients = (logger as any).loggerClients as LoggerClient[];
        expect(telemetryClients.filter(c => c instanceof AppInsightsLoggerClient)).toHaveLength(1);
        expect(telemetryClients.filter(c => c instanceof ConsoleLoggerClient)).toHaveLength(1);
    });

    it('verify context logger resolution', () => {
        registerLoggerToContainer(container);

        const logger = container.get(ContextAwareLogger);

        verifySingletonDependencyResolution(Logger);

        const telemetryClients = (logger as any).loggerClients as LoggerClient[];
        expect(telemetryClients.filter(c => c instanceof ContextAwareAppInsightsLoggerClient)).toHaveLength(1);
        expect(telemetryClients.filter(c => c instanceof ContextAwareConsoleLoggerClient)).toHaveLength(1);
    });

    function verifySingletonDependencyResolution(key: any): void {
        expect(container.get(key)).toBeDefined();
        expect(container.get(key)).toBe(container.get(key));
    }

    function verifyNonSingletonDependencyResolution(key: any): void {
        expect(container.get(key)).toBeDefined();
        expect(container.get(key)).not.toBe(container.get(key));
    }
});
