import * as appInsights from 'applicationinsights';
import { Container } from 'inversify';
import { Logger } from './logger';
import { loggerTypes } from './logger-types';

export function registerLoggerToContainer(container: Container): void {
    container.bind(loggerTypes.AppInsights).toConstantValue(appInsights);
    container.bind(loggerTypes.Process).toConstantValue(process);
    container
        .bind(Logger)
        .toSelf()
        .inSingletonScope();
}
