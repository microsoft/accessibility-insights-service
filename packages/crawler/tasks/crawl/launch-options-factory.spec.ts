import { createCrawlResult, getNotAllowedUrls } from '../../test-utilities/common-mock-methods';
import { CrawlerLaunchOptions, CrawlerRequestOptions } from './hc-crawler-types';
import { LaunchOptionsFactory } from './launch-options-factory';

describe('LaunchOptionsFactory', () => {
    let testSubject: LaunchOptionsFactory;
    beforeEach(() => {
        testSubject = new LaunchOptionsFactory();
    });

    it('should create an instance', () => {
        const url = 'https://www.microsoft.com/device/surface';
        const options: CrawlerLaunchOptions = testSubject.create(url);
        expect(options).toMatchObject({
            maxDepth: 1,
            maxConcurrency: 5,
            allowedDomains: ['www.microsoft.com'],
            obeyRobotsTxt: false,
            retryCount: 1,
        });
    });

    test.each(getNotAllowedUrls())('should reject the unsupprted urls preRequest %o', async (preRequestUrl: string) => {
        const options: CrawlerLaunchOptions = testSubject.create(preRequestUrl);

        const reqOptions: CrawlerRequestOptions = {
            url: preRequestUrl,
        };
        const shouldProceeed: boolean = options.preRequest(reqOptions);
        expect(shouldProceeed).toEqual(false);
    });

    it('should reject crawling for login page', () => {
        const loginUrl = 'https://login.microsoftonline.com/abc/xyz';
        const options: CrawlerLaunchOptions = testSubject.create(loginUrl);
        const reqOptions: CrawlerRequestOptions = {
            url: loginUrl,
        };
        const shouldProceeed: boolean = options.preRequest(reqOptions);
        expect(shouldProceeed).toEqual(false);
    });

    it('should call success of valid url', () => {
        const url = 'https://www.microsoft.com/device/surface';
        const options: CrawlerLaunchOptions = testSubject.create(url);

        options.onSuccess(createCrawlResult(url));
    });
});
