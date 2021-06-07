// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as appInsights from 'applicationinsights';
import * as dotenv from 'dotenv';
import { Container } from 'inversify';
import { AppInsightsLoggerClient } from './app-insights-logger-client';
import { ConsoleLoggerClient } from './console-logger-client';
import { ContextAwareAppInsightsLoggerClient } from './context-aware-app-insights-logger-client';
import { ContextAwareConsoleLoggerClient } from './context-aware-console-logger-client';
import { ContextAwareLogger } from './context-aware-logger';
import { GlobalLogger } from './global-logger';
import { LoggerClient } from './logger-client';
import { loggerTypes } from './logger-types';
import { registerContextAwareLoggerToContainer, registerLoggerToContainer } from './register-logger-to-container';

/* eslint-disable @typescript-eslint/no-explicit-any */

let container: Container;

describe('registerGlobalLoggerToContainer', () => {
    beforeEach(() => {
        container = new Container({ autoBindInjectable: true });
    });

    it('verify logger dependency resolution', () => {
        registerLoggerToContainer(container);

        expect(container.get(loggerTypes.AppInsights)).toStrictEqual(appInsights);
        expect(container.get(loggerTypes.Process)).toStrictEqual(process);
        expect(container.get(loggerTypes.Console)).toStrictEqual(console);
        expect(container.get(loggerTypes.DotEnvConfig)).toStrictEqual(dotenv.config());

        verifySingletonDependencyResolution(AppInsightsLoggerClient);
        verifySingletonDependencyResolution(ConsoleLoggerClient);
        verifySingletonDependencyResolution(loggerTypes.DotEnvConfig);
    });

    it('verify GlobalLogger resolution', () => {
        registerLoggerToContainer(container);

        const logger = container.get(GlobalLogger);

        const telemetryClients = (logger as any).loggerClients as LoggerClient[];
        expect(telemetryClients.filter((c) => c instanceof AppInsightsLoggerClient)).toHaveLength(1);
        expect(telemetryClients.filter((c) => c instanceof ConsoleLoggerClient)).toHaveLength(1);
    });
});

describe('registerContextAwareLoggerToContainer', () => {
    beforeEach(() => {
        container = new Container({ autoBindInjectable: true });
    });

    it('verify logger dependency resolution', () => {
        registerLoggerToContainer(container);

        verifySingletonDependencyResolution(ContextAwareAppInsightsLoggerClient);
        verifySingletonDependencyResolution(ContextAwareConsoleLoggerClient);
    });

    it('verify context container logger resolution', () => {
        registerLoggerToContainer(container);

        const contextContainer = new Container({ autoBindInjectable: true });
        contextContainer.parent = container;
        registerContextAwareLoggerToContainer(contextContainer);

        verifySingletonDependencyResolution(ContextAwareLogger);
        verifySingletonDependencyResolution(ContextAwareLogger, contextContainer);
    });

    it('verify context logger resolution', () => {
        registerLoggerToContainer(container);

        const logger = container.get(ContextAwareLogger);

        const telemetryClients = (logger as any).loggerClients as LoggerClient[];
        expect(telemetryClients.filter((c) => c instanceof ContextAwareAppInsightsLoggerClient)).toHaveLength(1);
        expect(telemetryClients.filter((c) => c instanceof ContextAwareConsoleLoggerClient)).toHaveLength(1);
    });
});

function verifySingletonDependencyResolution(key: any, testContainer: Container = container): void {
    expect(testContainer.get(key)).toBeDefined();
    expect(testContainer.get(key)).toBe(testContainer.get(key));
}
