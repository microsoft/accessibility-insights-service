// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { discoveredUrlProcessor } from './discovered-url-processor';

describe(discoveredUrlProcessor, () => {
    const urlsList = ['url1', 'url2', 'url3', 'url4'];
    const knownUrls = ['url1', 'url2', 'anotherUrl'];
    const maxUrlsLimit = 10;

    it('filters out known urls', () => {
        const expectedUrls = ['url3', 'url4'];

        const processedUrls = discoveredUrlProcessor(urlsList, maxUrlsLimit, knownUrls);

        expect(processedUrls).toEqual(expectedUrls);
    });

    it('limits the number of urls according to config and count of knownUrls', () => {
        const deepScanDiscoveryLimit = 3;

        const processedUrls = discoveredUrlProcessor(urlsList, deepScanDiscoveryLimit, ['some url']);

        expect(processedUrls.length).toBe(2);
    });

    it('filters and applies limit in correct order', () => {
        const deepScanDiscoveryLimit = knownUrls.length + 1;

        const processedUrls = discoveredUrlProcessor(urlsList, deepScanDiscoveryLimit, knownUrls);

        expect(processedUrls.length).toBe(1);
        expect(knownUrls).not.toContain(processedUrls[0]);
    });

    it('handles missing knownPages', () => {
        const processedUrls = discoveredUrlProcessor(urlsList, maxUrlsLimit, undefined);

        expect(processedUrls).toEqual(urlsList);
    });

    it('handles knownUrls.length > deepScanDiscoveryLimit', () => {
        const deepScanDiscoveryLimit = knownUrls.length - 1;

        const processedUrls = discoveredUrlProcessor(urlsList, deepScanDiscoveryLimit, knownUrls);

        expect(processedUrls.length).toBe(0);
    });
});
