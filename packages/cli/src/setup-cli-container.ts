// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Crawler, setupCrawlerContainer } from 'accessibility-insights-crawler';
import * as inversify from 'inversify';

export function setupCliContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    setupCrawlerContainer(container);
    container.bind(Crawler).toConstantValue(new Crawler(container));

    return container;
}
