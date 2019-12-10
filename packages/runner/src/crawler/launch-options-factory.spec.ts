// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { createCrawlResult, getNotAllowedUrls } from '../../test-utilities/common-mock-methods';
import { MockableLogger } from '../../test-utilities/mockable-logger';
import { HCCrawlerOptionsFactory } from './hc-crawler-options-factory';
import { CrawlerConnectOptions, CrawlerLaunchOptions, CrawlerRequestOptions } from './hc-crawler-types';

describe('LaunchOptionsFactory', () => {
    let baseUrl: string;
    let testSubject: HCCrawlerOptionsFactory;
    let browserWSEndPoint: string;
    let loggerMock: IMock<MockableLogger>;
    let processMock: IMock<typeof process>;
    beforeEach(() => {
        baseUrl = 'https://www.microsoft.com';
        loggerMock = Mock.ofType(MockableLogger);
        processMock = Mock.ofInstance(process);
        testSubject = new HCCrawlerOptionsFactory(loggerMock.object, processMock.object);
        browserWSEndPoint = 'ws://localhost';
    });

    it('should create an instance', () => {
        const url = 'https://www.microsoft.com/device/surface';

        const options: CrawlerConnectOptions = testSubject.createConnectOptions(url, baseUrl, browserWSEndPoint);
        expect(options).toMatchObject({
            maxDepth: 1,
            maxConcurrency: 1,
            allowedDomains: ['www.microsoft.com'],
            obeyRobotsTxt: false,
            retryCount: 1,
            browserWSEndpoint: 'ws://localhost',
            exporter: undefined,
            scanResult: [],
        });
    });

    test.each(getNotAllowedUrls())('should reject the unsupported urls preRequest %o', async (preRequestUrl: string) => {
        const options: CrawlerConnectOptions = testSubject.createConnectOptions(preRequestUrl, baseUrl, browserWSEndPoint);

        const reqOptions: CrawlerRequestOptions = {
            url: preRequestUrl,
        };
        const shouldProceed: boolean = options.preRequest(reqOptions);
        expect(shouldProceed).toEqual(false);
    });

    it('should reject crawling for login page', () => {
        const loginUrl = 'https://login.microsoftonline.com/abc/xyz';
        const options: CrawlerConnectOptions = testSubject.createConnectOptions(loginUrl, baseUrl, browserWSEndPoint);
        const reqOptions: CrawlerRequestOptions = {
            url: loginUrl,
        };
        const shouldProceed: boolean = options.preRequest(reqOptions);
        expect(shouldProceed).toEqual(false);
    });

    it('should reject crawling for not allowed domain', () => {
        baseUrl = 'https://www.microsoft.com/abc/xyz';
        const url = 'https://www.microsoft.com/abc/xyz';
        const options: CrawlerConnectOptions = testSubject.createConnectOptions(url, baseUrl, browserWSEndPoint);
        const reqOptions: CrawlerRequestOptions = {
            url: 'https://www.external.com/abc/xyz',
        };
        const shouldProceed: boolean = options.preRequest(reqOptions);
        expect(shouldProceed).toEqual(false);
    });

    it('should call success of valid url', () => {
        const url = 'https://www.microsoft.com/device/surface';
        const options: CrawlerLaunchOptions = testSubject.createConnectOptions(url, baseUrl, browserWSEndPoint);

        options.onSuccess(createCrawlResult(url));
    });

    it('should only add valid links to the scan result', () => {
        const url = 'https://www.microsoft.com/device/';
        const crawResult = createCrawlResult(url);
        const pdfLink = 'https://www.microsoft.com/device/surface.pdf';
        const externalLink = 'https://www.external.com/device/child-link';
        const validLink = 'https://www.microsoft.com/device/child-link';
        crawResult.links = [pdfLink, externalLink, validLink];

        const options: CrawlerLaunchOptions = testSubject.createConnectOptions(url, baseUrl, browserWSEndPoint);

        options.onSuccess(crawResult);
        expect(options.scanResult[0].links).toEqual([validLink]);
    });

    it('should not add child links that do not share the same path to the scan result', () => {
        baseUrl = 'https://www.microsoft.com/device/';
        const url = 'https://www.microsoft.com/device/xbox';
        const crawResult = createCrawlResult(url);
        const validLink = 'https://www.microsoft.com/device/surface';
        const ancestorLink = 'https://www.microsoft.com/';
        const siblingLink = 'https://www.microsoft.com/service/foo';
        crawResult.links = [validLink, ancestorLink, siblingLink];

        const options: CrawlerLaunchOptions = testSubject.createConnectOptions(url, baseUrl, browserWSEndPoint);

        options.onSuccess(crawResult);
        expect(options.scanResult[0].links).toEqual([validLink]);
    });

    it('validate only valid child link is added for complicated base urls', () => {
        baseUrl = 'https://www.host.com/p/a/?query=helloworld';
        const url = 'https://www.host.com/p/a/t/h?query=hello';
        const crawResult = createCrawlResult(url);
        const validLink1 = 'https://www.host.com/p/a/t/h/foo';
        const validLink2 = 'https://www.host.com/p/a/foo';
        const invalidLink = 'https://www.host.com/bar/foo';

        crawResult.links = [validLink1, validLink2, invalidLink];

        const options: CrawlerLaunchOptions = testSubject.createConnectOptions(url, baseUrl, browserWSEndPoint);

        options.onSuccess(crawResult);
        expect(options.scanResult[0].links).toEqual([validLink1, validLink2]);
    });
});
