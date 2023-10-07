// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import { UrlLocationValidator } from '../website-builder/url-location-validator';
import { DiscoveredUrlProcessor } from './discovered-url-processor';

const urlsList = ['url1', 'url2', 'url3', 'url4'];
const knownUrls = ['url1', 'url2', 'anotherUrl'];
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
        const blockedList = ['url1/document.pdf', 'url2/picture.png'];
        const list = [...blockedList, 'url3/path', 'url4'];
        urlLocationValidatorMock.reset();
        urlLocationValidatorMock
            .setup((o) => o.allowed(It.isAny()))
            .returns((u) => {
                return !blockedList.includes(u);
            })
            .verifiable(Times.atLeast(4));

        const expectedUrls = ['url3/path', 'url4'];
        const processedUrls = discoveredUrlProcessor.process(list, maxUrlsLimit);

        expect(processedUrls).toEqual(expectedUrls);
    });

    it('filters out known urls', () => {
        const expectedUrls = ['url3', 'url4'];
        const processedUrls = discoveredUrlProcessor.process(urlsList, maxUrlsLimit, knownUrls);

        expect(processedUrls).toEqual(expectedUrls);
    });

    it('limits the number of urls according to config and count of knownUrls', () => {
        const deepScanDiscoveryLimit = 3;
        const processedUrls = discoveredUrlProcessor.process(urlsList, deepScanDiscoveryLimit, ['some url']);

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
