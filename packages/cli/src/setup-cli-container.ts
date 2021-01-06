// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Crawler, setupCrawlerContainer } from 'accessibility-insights-crawler';
import * as inversify from 'inversify';

export function setupCliContainer(
    container: inversify.Container = new inversify.Container({ autoBindInjectable: true }),
): inversify.Container {
    setupCrawlerContainer(container);
    container.bind(Crawler).toConstantValue(new Crawler(container));

    return container;
}
