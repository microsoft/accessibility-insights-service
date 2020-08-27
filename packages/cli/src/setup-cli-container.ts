// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { reporterFactory } from 'accessibility-insights-report';
import * as inversify from 'inversify';
import { Browser } from 'puppeteer';
import { ApifyResourceCreator } from './apify/apify-resource-creator';
import { CrawlerConfiguration } from './crawler/crawler-configuration';
import { CrawlerFactory } from './crawler/crawler-factory';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { PageProcessorFactory } from './page-processors/page-processor-factory';
import { ReportDiskWriter } from './report/report-disk-writer';
import { ReportGenerator } from './report/report-generator';
import { ConsoleSummaryReportGenerator } from './report/summary-report/console-summary-report-generator';
import { JsonSummaryReportGenerator } from './report/summary-report/json-summary-report-generator';
import { CrawlerCommandRunner } from './runner/crawler-command-runner';
import { FileCommandRunner } from './runner/file-command-runner';
import { URLCommandRunner } from './runner/url-command-runner';
import { AIScanner } from './scanner/ai-scanner';
import { WebDriver } from './web-driver/web-driver';

export function setupCliContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    container.bind(AIScanner).toSelf().inSingletonScope();
    container.bind('ReporterFactory').toConstantValue(reporterFactory);
    container.bind(ReportGenerator).toSelf().inSingletonScope();
    container.bind(URLCommandRunner).toSelf().inSingletonScope();
    container.bind(CrawlerCommandRunner).toSelf().inSingletonScope();
    container.bind(ReportDiskWriter).toSelf().inSingletonScope();
    container.bind(FileCommandRunner).toSelf().inSingletonScope();
    container.bind(ConsoleSummaryReportGenerator).toSelf().inSingletonScope();
    container.bind(JsonSummaryReportGenerator).toSelf().inSingletonScope();
    container.bind(CrawlerConfiguration).toSelf().inSingletonScope();
    container.bind(CrawlerFactory).toSelf().inSingletonScope();
    container.bind(ApifyResourceCreator).toSelf().inSingletonScope();
    container.bind(PageProcessorFactory).toSelf().inSingletonScope();

    container.bind<AxePuppeteerFactory>(AxePuppeteerFactory).toSelf().inSingletonScope();

    container.bind<inversify.interfaces.Factory<Browser>>('Factory<Browser>').toFactory<Browser>((context) => {
        return () => {
            return context.container.get<WebDriver>(WebDriver).browser;
        };
    });

    return container;
}
