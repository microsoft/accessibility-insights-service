// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Url } from 'common';
import { IMock, Mock } from 'typemoq';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { PageProcessorOptions } from '../types/run-options';
import { ClassicPageProcessor } from './classic-page-processor';
import { PageProcessorFactory } from './page-processor-factory';
import { SimulatorPageProcessor } from './simulator-page-processor';

// tslint:disable: no-any

describe(PageProcessorFactory, () => {
    let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
    let pageProcessorFactory: PageProcessorFactory;
    let urlMock: IMock<typeof Url>;
    const baseUrl = 'base url';

    beforeEach(() => {
        crawlerConfigurationMock = Mock.ofType(CrawlerConfiguration);
        urlMock = Mock.ofType<typeof Url>();
        pageProcessorFactory = new PageProcessorFactory(crawlerConfigurationMock.object, urlMock.object);

        urlMock
            .setup((um) => um.getRootUrl(baseUrl))
            .returns(() => baseUrl)
            .verifiable();
    });

    it('PageProcessorFactory, classic page processor', async () => {
        const pageProcessorOptions: PageProcessorOptions = {
            requestQueue: undefined,
            crawlerRunOptions: {
                baseUrl: baseUrl,
                discoveryPatterns: undefined,
                selectors: undefined,
                simulate: false,
            },
        };
        crawlerConfigurationMock
            .setup((ccm) => ccm.getDiscoveryPattern(baseUrl, undefined))
            .returns(() => [])
            .verifiable();
        const pageProcessor = pageProcessorFactory.createPageProcessor(pageProcessorOptions);
        expect(pageProcessor).toBeInstanceOf(ClassicPageProcessor);
    });

    it('PageProcessorFactory, simulate page processor', () => {
        const pageProcessorOptions: PageProcessorOptions = {
            requestQueue: undefined,
            crawlerRunOptions: {
                baseUrl: baseUrl,
                discoveryPatterns: undefined,
                simulate: true,
            },
        };
        crawlerConfigurationMock
            .setup((ccm) => ccm.getDiscoveryPattern(baseUrl, undefined))
            .returns(() => [])
            .verifiable();

        crawlerConfigurationMock
            .setup((ccm) => ccm.getDefaultSelectors(undefined))
            .returns(() => [])
            .verifiable();
        const pageProcessor = pageProcessorFactory.createPageProcessor(pageProcessorOptions);
        expect(pageProcessor).toBeInstanceOf(SimulatorPageProcessor);
    });

    afterEach(() => {
        crawlerConfigurationMock.verifyAll();
        urlMock.verifyAll();
    });
});
