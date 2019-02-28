import { getNotAllowedUrls } from '../../test-utilities/common-mock-methods';
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
});
