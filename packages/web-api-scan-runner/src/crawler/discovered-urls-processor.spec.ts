// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CrawlConfig, ServiceConfiguration } from 'common';
import { WebsiteScanResult } from 'storage-documents';
import { IMock, Mock } from 'typemoq';
import { DiscoveredUrlsProcessor } from './discovered-urls-processor';

describe(DiscoveredUrlsProcessor, () => {
    const urlsList = ['url1', 'url2', 'url3', 'url4'];
    const knownUrls = ['url1', 'url2', 'anotherUrl'];
    const maxUrlsLimit = 10;
    const websiteScanResultStub = {
        knownPages: knownUrls,
    } as WebsiteScanResult;
    let serviceConfigMock: IMock<ServiceConfiguration>;

    let testSubject: DiscoveredUrlsProcessor;

    beforeEach(() => {
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();

        testSubject = new DiscoveredUrlsProcessor(serviceConfigMock.object);
    });

    it('filters out known urls', async () => {
        setupUrlLimit(maxUrlsLimit);
        const expectedUrls = ['url3', 'url4'];

        const processedUrls = await testSubject.getProcessedUrls(urlsList, websiteScanResultStub);

        expect(processedUrls).toEqual(expectedUrls);
    });

    it('limits the number of urls according to config and count of knownUrls', async () => {
        setupUrlLimit(3);

        const processedUrls = await testSubject.getProcessedUrls(urlsList, { knownPages: ['some url'] } as WebsiteScanResult);

        expect(processedUrls.length).toBe(2);
    });

    it('filters and applies limit in correct order', async () => {
        setupUrlLimit(knownUrls.length + 1);

        const processedUrls = await testSubject.getProcessedUrls(urlsList, websiteScanResultStub);

        expect(processedUrls.length).toBe(1);
        expect(knownUrls).not.toContain(processedUrls[0]);
    });

    it('handles missing websiteScanResults', async () => {
        setupUrlLimit(maxUrlsLimit);

        const processedUrls = await testSubject.getProcessedUrls(urlsList, null);

        expect(processedUrls).toEqual(urlsList);
    });

    it('handles missing knownPages', async () => {
        setupUrlLimit(maxUrlsLimit);

        const processedUrls = await testSubject.getProcessedUrls(urlsList, {} as WebsiteScanResult);

        expect(processedUrls).toEqual(urlsList);
    });

    function setupUrlLimit(limit: number): void {
        const crawlConfig: CrawlConfig = {
            urlCrawlLimit: limit,
        };
        serviceConfigMock.setup((sc) => sc.getConfigValue('crawlConfig')).returns(async () => Promise.resolve(crawlConfig));
    }
});
