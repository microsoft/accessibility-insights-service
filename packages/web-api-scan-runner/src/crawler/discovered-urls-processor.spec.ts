// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { WebsiteScanResult } from 'storage-documents';
import { processDiscoveredUrls } from './discovered-urls-processor';

describe(processDiscoveredUrls, () => {
    const urlsList = ['url1', 'url2', 'url3', 'url4'];
    const knownUrls = ['url1', 'url2', 'anotherUrl'];
    const maxUrlsLimit = 10;
    const websiteScanResultStub = {
        knownPages: knownUrls,
    } as WebsiteScanResult;

    it('filters out known urls', () => {
        const expectedUrls = ['url3', 'url4'];

        const processedUrls = processDiscoveredUrls(urlsList, maxUrlsLimit, websiteScanResultStub);

        expect(processedUrls).toEqual(expectedUrls);
    });

    it('limits the number of urls according to config and count of knownUrls', () => {
        const urlCrawlLimit = 3;

        const processedUrls = processDiscoveredUrls(urlsList, urlCrawlLimit, { knownPages: ['some url'] } as WebsiteScanResult);

        expect(processedUrls.length).toBe(2);
    });

    it('filters and applies limit in correct order', () => {
        const urlCrawlLimit = knownUrls.length + 1;

        const processedUrls = processDiscoveredUrls(urlsList, urlCrawlLimit, websiteScanResultStub);

        expect(processedUrls.length).toBe(1);
        expect(knownUrls).not.toContain(processedUrls[0]);
    });

    it('handles missing websiteScanResults', () => {
        const processedUrls = processDiscoveredUrls(urlsList, maxUrlsLimit, null);

        expect(processedUrls).toEqual(urlsList);
    });

    it('handles missing knownPages', () => {
        const processedUrls = processDiscoveredUrls(urlsList, maxUrlsLimit, {} as WebsiteScanResult);

        expect(processedUrls).toEqual(urlsList);
    });

    it('handles knownUrls.length > urlCrawlLimit', () => {
        const urlCrawlLimit = knownUrls.length - 1;

        const processedUrls = processDiscoveredUrls(urlsList, urlCrawlLimit, websiteScanResultStub);

        expect(processedUrls.length).toBe(0);
    });
});
