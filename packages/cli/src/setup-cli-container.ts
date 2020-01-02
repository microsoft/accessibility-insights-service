// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { reporterFactory } from 'accessibility-insights-report';
import * as inversify from 'inversify';
import { Browser } from 'puppeteer';
import { CommandRunner } from './command-runner';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { ReportGenerator } from './report/report-generator';
import { AIScanner } from './scanner/ai-scanner';
import { WebDriver } from './web-driver/web-driver';
export function setupCliContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    container
        .bind(AIScanner)
        .toSelf()
        .inSingletonScope();
    container.bind('ReporterFactory').toConstantValue(reporterFactory);
    container
        .bind(ReportGenerator)
        .toSelf()
        .inSingletonScope();
    container
        .bind(CommandRunner)
        .toSelf()
        .inSingletonScope();

    container
        .bind<AxePuppeteerFactory>(AxePuppeteerFactory)
        .toSelf()
        .inSingletonScope();

    container.bind<inversify.interfaces.Factory<Browser>>('Factory<Browser>').toFactory<Browser>(context => {
        return () => {
            return context.container.get<WebDriver>(WebDriver).browser;
        };
    });

    return container;
}
