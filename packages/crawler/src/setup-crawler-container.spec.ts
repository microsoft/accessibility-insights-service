// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ApifyResourceCreator } from './apify-resources/resource-creator';
import { CrawlerConfiguration } from './crawler/crawler-configuration';
import { CrawlerEngine } from './crawler/crawler-engine';
import { CrawlerFactory } from './crawler/crawler-factory';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { AccessibilityScanOperation } from './page-operations/accessibility-scan-operation';
import { ClickElementOperation } from './page-operations/click-element-operation';
import { EnqueueActiveElementsOperation } from './page-operations/enqueue-active-elements-operation';
import { PageProcessorFactory } from './page-processors/page-processor-factory';
import { PageScanner } from './scanner-operations/page-scanner';
import { setupCrawlerContainer } from './setup-crawler-container';
import { ActiveElementsFinder } from './utility/active-elements-finder';

describe(setupCrawlerContainer, () => {
    it('resolves dependencies', () => {
        const container = setupCrawlerContainer();

        expect(container.get(CrawlerEngine)).toBeDefined();
        expect(container.get(CrawlerConfiguration)).toBeDefined();
        expect(container.get(CrawlerFactory)).toBeDefined();
        expect(container.get(ApifyResourceCreator)).toBeDefined();
        expect(container.get(AccessibilityScanOperation)).toBeDefined();
        expect(container.get(ClickElementOperation)).toBeDefined();
        expect(container.get(EnqueueActiveElementsOperation)).toBeDefined();
        expect(container.get(PageProcessorFactory)).toBeDefined();
        expect(container.get(PageScanner)).toBeDefined();
        expect(container.get(AxePuppeteerFactory)).toBeDefined();
        expect(container.get(ActiveElementsFinder)).toBeDefined();

    });
});
