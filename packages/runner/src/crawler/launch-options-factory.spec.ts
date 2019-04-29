import 'reflect-metadata';

import { Logger } from 'logger';
import { IMock, Mock } from 'typemoq';
import { createCrawlResult, getNotAllowedUrls } from '../test-utilities/common-mock-methods';
import { HCCrawlerOptionsFactory } from './hc-crawler-options-factory';
import { CrawlerConnectOptions, CrawlerLaunchOptions, CrawlerRequestOptions } from './hc-crawler-types';

describe('LaunchOptionsFactory', () => {
    let testSubject: HCCrawlerOptionsFactory;
    let browserWSEndPoint: string;
    let loggerMock: IMock<Logger>;
    let processMock: IMock<typeof process>;
    beforeEach(() => {
        loggerMock = Mock.ofType(Logger);
        processMock = Mock.ofInstance(process);
        testSubject = new HCCrawlerOptionsFactory(loggerMock.object, processMock.object);
        browserWSEndPoint = 'ws://localhost';
    });

    it('should create an instance', () => {
        const url = 'https://www.microsoft.com/device/surface';

        const options: CrawlerConnectOptions = testSubject.createConnectOptions(url, browserWSEndPoint);
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

    test.each(getNotAllowedUrls())('should reject the unsupprted urls preRequest %o', async (preRequestUrl: string) => {
        const options: CrawlerConnectOptions = testSubject.createConnectOptions(preRequestUrl, browserWSEndPoint);

        const reqOptions: CrawlerRequestOptions = {
            url: preRequestUrl,
        };
        const shouldProceeed: boolean = options.preRequest(reqOptions);
        expect(shouldProceeed).toEqual(false);
    });

    it('should reject crawling for login page', () => {
        const loginUrl = 'https://login.microsoftonline.com/abc/xyz';
        const options: CrawlerConnectOptions = testSubject.createConnectOptions(loginUrl, browserWSEndPoint);
        const reqOptions: CrawlerRequestOptions = {
            url: loginUrl,
        };
        const shouldProceeed: boolean = options.preRequest(reqOptions);
        expect(shouldProceeed).toEqual(false);
    });

    it('should call success of valid url', () => {
        const url = 'https://www.microsoft.com/device/surface';
        const options: CrawlerLaunchOptions = testSubject.createConnectOptions(url, browserWSEndPoint);

        options.onSuccess(createCrawlResult(url));
    });
});
