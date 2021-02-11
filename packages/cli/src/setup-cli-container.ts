// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Crawler, setupLocalCrawlerContainer } from 'accessibility-insights-crawler';
import * as inversify from 'inversify';

export function setupCliContainer(
    container: inversify.Container = new inversify.Container({ autoBindInjectable: true }),
): inversify.Container {
    setupLocalCrawlerContainer(container);
    container.bind(Crawler).toConstantValue(new Crawler(container));

    return container;
}
