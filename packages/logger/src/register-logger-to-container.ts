// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as appInsights from 'applicationinsights';
import * as dotenv from 'dotenv';
import { Container } from 'inversify';
import * as argv from 'yargs';
import { ContextAppInsightsContextLoggerClient } from './context-app-insights-logger-client';
import { ContextConsoleLoggerClient } from './context-console-logger-client';
import { ContextLogger } from './context-logger';
import { Logger } from './logger';
import { loggerTypes } from './logger-types';
import { RootAppInsightsLoggerClient } from './root-app-insights-logger-client';
import { RootConsoleLoggerClient } from './root-console-logger-client';

export function registerLoggerToContainer(container: Container): void {
    container.bind(loggerTypes.AppInsights).toConstantValue(appInsights);
    container.bind(loggerTypes.Process).toConstantValue(process);
    container
        .bind(RootAppInsightsLoggerClient)
        .toSelf()
        .inSingletonScope();
    container
        .bind(RootConsoleLoggerClient)
        .toSelf()
        .inSingletonScope();

    container.bind(loggerTypes.DotEnvConfig).toConstantValue(dotenv.config());
    container.bind(loggerTypes.Argv).toConstantValue(argv);
    container.bind(loggerTypes.Console).toConstantValue(console);

    container
        .bind(Logger)
        .toDynamicValue(context => {
            const appInsightsLoggerClient = context.container.get(RootAppInsightsLoggerClient);
            const consoleLoggerClient = context.container.get(RootConsoleLoggerClient);

            return new Logger([appInsightsLoggerClient, consoleLoggerClient], context.container.get(loggerTypes.Process));
        })
        .inSingletonScope();

    container.bind(ContextLogger).toDynamicValue(context => {
        const appInsightsLoggerClient = context.container.get(ContextAppInsightsContextLoggerClient);
        const consoleLoggerClient = context.container.get(ContextConsoleLoggerClient);

        return new ContextLogger([appInsightsLoggerClient, consoleLoggerClient], context.container.get(loggerTypes.Process));
    });
}
