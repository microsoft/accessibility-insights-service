// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as appInsights from 'applicationinsights';
import * as dotenv from 'dotenv';
import { Container } from 'inversify';
import { AppInsightsLoggerClient } from './app-insights-logger-client';
import { ConsoleLoggerClient } from './console-logger-client';
import { ContextAwareAppInsightsLoggerClient } from './context-aware-app-insights-logger-client';
import { ContextAwareConsoleLoggerClient } from './context-aware-console-logger-client';
import { ContextAwareLogger } from './context-aware-logger';
import { GlobalLogger } from './global-logger';
import { loggerTypes } from './logger-types';

export function registerLoggerToContainer(container: Container): void {
    registerLoggerDependenciesToContainer(container);
    registerGlobalLoggerToContainer(container);
    registerContextAwareLoggerToContainer(container);
}

export function registerContextAwareLoggerToContainer(container: Container): void {
    container.bind(ContextAwareAppInsightsLoggerClient).toSelf().inSingletonScope();
    container.bind(ContextAwareConsoleLoggerClient).toSelf().inSingletonScope();

    container
        .bind(ContextAwareLogger)
        .toDynamicValue((context) => {
            const appInsightsLoggerClient = context.container.get(ContextAwareAppInsightsLoggerClient);
            const consoleLoggerClient = context.container.get(ContextAwareConsoleLoggerClient);

            return new ContextAwareLogger([appInsightsLoggerClient, consoleLoggerClient], context.container.get(loggerTypes.Process));
        })
        .inSingletonScope();
}

function registerGlobalLoggerToContainer(container: Container): void {
    container
        .bind(GlobalLogger)
        .toDynamicValue((context) => {
            const appInsightsLoggerClient = context.container.get(AppInsightsLoggerClient);
            const consoleLoggerClient = context.container.get(ConsoleLoggerClient);

            return new GlobalLogger([appInsightsLoggerClient, consoleLoggerClient], context.container.get(loggerTypes.Process));
        })
        .inSingletonScope();
}

function registerLoggerDependenciesToContainer(container: Container): void {
    container.bind(loggerTypes.AppInsights).toConstantValue(appInsights);
    container.bind(loggerTypes.Process).toConstantValue(process);
    container.bind(AppInsightsLoggerClient).toSelf().inSingletonScope();
    container.bind(ConsoleLoggerClient).toSelf().inSingletonScope();
    container.bind(loggerTypes.DotEnvConfig).toConstantValue(dotenv.config());
    container.bind(loggerTypes.Console).toConstantValue(console);
}
