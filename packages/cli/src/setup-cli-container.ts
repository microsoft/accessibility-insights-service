// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CrawlerEntryPoint, setupCrawlerContainer } from 'accessibility-insights-crawler';
import { reporterFactory } from 'accessibility-insights-report';
import * as inversify from 'inversify';

export function setupCliContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    container.bind('ReporterFactory').toConstantValue(reporterFactory);
    container.bind(CrawlerEntryPoint).toConstantValue(new CrawlerEntryPoint(setupCrawlerContainer()));

    return container;
}
