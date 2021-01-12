// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Crawler, setupLocalCrawlerContainer } from 'accessibility-insights-crawler';
import * as inversify from 'inversify';

export function setupCliContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    setupLocalCrawlerContainer(container);
    container.bind(Crawler).toConstantValue(new Crawler<void>(container));

    return container;
}
