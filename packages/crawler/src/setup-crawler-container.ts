// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { reporterFactory } from 'accessibility-insights-report';
import * as inversify from 'inversify';
import { CrawlerConfiguration } from './crawler/crawler-configuration';

export function setupCrawlerContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    container.bind(CrawlerConfiguration).toSelf().inSingletonScope();
    container.bind('ReporterFactory').toConstantValue(reporterFactory);

    return container;
}
