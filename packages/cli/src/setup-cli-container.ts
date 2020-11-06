// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Crawler, setupCrawlerContainer } from 'accessibility-insights-crawler';
import { reporterFactory } from 'accessibility-insights-report';
import * as inversify from 'inversify';

export function setupCliContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    container.bind('ReporterFactory').toConstantValue(reporterFactory);
    container.bind(Crawler).toConstantValue(new Crawler(setupCrawlerContainer()));

    return container;
}
