// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as appInsights from 'applicationinsights';
import * as dotenv from 'dotenv';
import { Container } from 'inversify';
import { AppInsightsLoggerClient } from './app-insights-logger-client';
import { ConsoleLoggerClient } from './console-logger-client';
import { GlobalLogger } from './global-logger';
import { loggerTypes } from './logger-types';
import { OTelLoggerClient } from './otel-logger-client';

export function registerLoggerToContainer(container: Container): void {
    registerLoggerDependenciesToContainer(container);
    registerGlobalLoggerToContainer(container);
}

function registerGlobalLoggerToContainer(container: Container): void {
    container
        .bind(GlobalLogger)
        .toDynamicValue((context) => {
            const appInsightsLoggerClient = context.container.get(AppInsightsLoggerClient);
            const consoleLoggerClient = context.container.get(ConsoleLoggerClient);
            const oTelLoggerClient = context.container.get(OTelLoggerClient);

            return new GlobalLogger([appInsightsLoggerClient, consoleLoggerClient, oTelLoggerClient]);
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
    container.bind(OTelLoggerClient).toSelf().inSingletonScope();
}
