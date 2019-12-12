// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { reporterFactory } from 'accessibility-insights-report';
import * as inversify from 'inversify';
import { ConsoleLoggerClient, Logger, loggerTypes, registerLoggerToContainer } from 'logger';
import { registerScannerToContainer } from 'scanner';
import { registerServiceLibraryToContainer } from 'service-library';
import { ReportGenerator } from './report-generator';
import { ScanRunner } from './scan-runner';

export function setupCliContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    registerLoggerToContainer(container);
    registerScannerToContainer(container);
    container
        .bind(ScanRunner)
        .toSelf()
        .inSingletonScope();
    container.unbind(Logger);
    container
        .bind(Logger)
        .toDynamicValue(context => {
            const consoleLoggerClient = context.container.get(ConsoleLoggerClient);

            return new Logger([consoleLoggerClient], context.container.get(loggerTypes.Process));
        })
        .inSingletonScope();
    registerServiceLibraryToContainer(container);
    container.bind('ReporterFactory').toConstantValue(reporterFactory);
    container
        .bind(ReportGenerator)
        .toSelf()
        .inSingletonScope();

    return container;
}
