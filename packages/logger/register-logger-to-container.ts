import * as appInsights from 'applicationinsights';
import { Container } from 'inversify';
import { AppInsightsLoggerClient } from './app-insights-logger-client';
import { ConsoleLoggerClient } from './console-logger-client';
import { Logger } from './logger';
import { loggerTypes } from './logger-types';

export function registerLoggerToContainer(container: Container): void {
    container.bind(loggerTypes.AppInsights).toConstantValue(appInsights);
    container.bind(loggerTypes.Process).toConstantValue(process);
    container
        .bind(AppInsightsLoggerClient)
        .toSelf()
        .inSingletonScope();
    container
        .bind(ConsoleLoggerClient)
        .toSelf()
        .inSingletonScope();

    container.bind(loggerTypes.console).toConstantValue(console);

    container
        .bind(Logger)
        .toDynamicValue(context => {
            const appInsightsLoggerClient = context.container.get(AppInsightsLoggerClient);
            const consoleLoggerClient = context.container.get(ConsoleLoggerClient);

            return new Logger([appInsightsLoggerClient, consoleLoggerClient], context.container.get(loggerTypes.Process));
        })
        .inSingletonScope();
}
