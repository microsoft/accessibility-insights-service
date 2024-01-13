// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import { UrlLocationValidator } from '../website-builder/url-location-validator';
import { DiscoveredUrlProcessor } from './discovered-url-processor';

const urlsList = ['http://url1?a=1&b=1', 'http://url2', 'http://url3', 'http://url4?b=1&a=1'];
const knownUrls = ['http://url1?b=1&a=1' /** Should normalize URL */, 'http://url2', 'http://anotherUrl'];
const maxUrlsLimit = 10;

let discoveredUrlProcessor: DiscoveredUrlProcessor;
let urlLocationValidatorMock: IMock<UrlLocationValidator>;

describe(DiscoveredUrlProcessor, () => {
    beforeEach(() => {
        urlLocationValidatorMock = Mock.ofType<UrlLocationValidator>();
        urlLocationValidatorMock.setup((o) => o.allowed(It.isAny())).returns(() => true);

        discoveredUrlProcessor = new DiscoveredUrlProcessor(urlLocationValidatorMock.object);
    });

    afterEach(() => {
        urlLocationValidatorMock.verifyAll();
    });

    it('filters out known resource type', () => {
        const blockedList = ['http://url1/document.pdf', 'http://url2/picture.png'];
        const list = [...blockedList, 'http://url3/path', 'http://url4'];
        urlLocationValidatorMock.reset();
        urlLocationValidatorMock
            .setup((o) => o.allowed(It.isAny()))
            .returns((u) => {
                return !blockedList.includes(u);
            })
            .verifiable(Times.atLeast(4));

        const expectedUrls = ['http://url3/path', 'http://url4'];
        const processedUrls = discoveredUrlProcessor.process(list, maxUrlsLimit);

        expect(processedUrls).toEqual(expectedUrls);
    });

    it('filters out known urls', () => {
        const expectedUrls = ['http://url3', 'http://url4?b=1&a=1' /** Should not change the original URL */];
        const processedUrls = discoveredUrlProcessor.process(urlsList, maxUrlsLimit, knownUrls);

        expect(processedUrls).toEqual(expectedUrls);
    });

    it('limits the number of urls according to config and count of knownUrls', () => {
        const deepScanDiscoveryLimit = 3;
        const processedUrls = discoveredUrlProcessor.process(urlsList, deepScanDiscoveryLimit, ['http://someUrl']);

        expect(processedUrls.length).toBe(2);
    });

    it('filters and applies limit in correct order', () => {
        const deepScanDiscoveryLimit = knownUrls.length + 1;
        const processedUrls = discoveredUrlProcessor.process(urlsList, deepScanDiscoveryLimit, knownUrls);

        expect(processedUrls.length).toBe(1);
        expect(knownUrls).not.toContain(processedUrls[0]);
    });

    it('handles missing knownPages', () => {
        const processedUrls = discoveredUrlProcessor.process(urlsList, maxUrlsLimit, undefined);

        expect(processedUrls).toEqual(urlsList);
    });

    it('handles knownUrls.length > deepScanDiscoveryLimit', () => {
        const deepScanDiscoveryLimit = knownUrls.length - 1;
        const processedUrls = discoveredUrlProcessor.process(urlsList, deepScanDiscoveryLimit, knownUrls);

        expect(processedUrls.length).toBe(0);
    });
});
