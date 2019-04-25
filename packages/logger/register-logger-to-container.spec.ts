import 'reflect-metadata';

import * as appInsights from 'applicationinsights';
import * as dotenv from 'dotenv';
import { Container } from 'inversify';
import * as argv from 'yargs';
import { AppInsightsLoggerClient } from './app-insights-logger-client';
import { ConsoleLoggerClient } from './console-logger-client';
import { Logger } from './logger';
import { LoggerClient } from './logger-client';
import { loggerTypes } from './logger-types';
import { registerLoggerToContainer } from './register-logger-to-container';

// tslint:disable: no-unsafe-any no-any

describe(registerLoggerToContainer, () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
    });

    it('verify logger dependency resolution', () => {
        registerLoggerToContainer(container);

        expect(container.get(loggerTypes.AppInsights)).toBe(appInsights);
        expect(container.get(loggerTypes.Process)).toBe(process);
        expect(container.get(loggerTypes.console)).toBe(console);
        expect(container.get(loggerTypes.Argv)).toBe(argv);
        expect(container.get(loggerTypes.DotEnvConfig)).toEqual(dotenv.config());

        verifySingletonDependencyResolution(AppInsightsLoggerClient);
        verifySingletonDependencyResolution(ConsoleLoggerClient);
        verifySingletonDependencyResolution(loggerTypes.DotEnvConfig);
    });

    it('verify logger resolution', () => {
        registerLoggerToContainer(container);

        const logger = container.get(Logger);

        verifySingletonDependencyResolution(Logger);

        const telemetryClients = (logger as any).loggerClients as LoggerClient[];
        expect(telemetryClients.filter(c => c instanceof AppInsightsLoggerClient)).toHaveLength(1);
        expect(telemetryClients.filter(c => c instanceof ConsoleLoggerClient)).toHaveLength(1);
    });

    function verifySingletonDependencyResolution(key: any): void {
        expect(container.get(key)).toBeDefined();
        expect(container.get(key)).toBe(container.get(key));
    }
});
