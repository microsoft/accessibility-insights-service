import { HCCrawlerLaunchOptions } from './hc-crawler-types';
import { LaunchOptionsFactory } from './launch-options-factory';
describe('LaunchOptionsFactory', () => {
    let testSubject: LaunchOptionsFactory;
    beforeEach(() => {
        testSubject = new LaunchOptionsFactory();
    });

    it('should create an instance', () => {
        const url = 'https://www.microsoft.com/device/surface';
        const options: HCCrawlerLaunchOptions = testSubject.create(url);
        expect(options.maxDepth).toEqual(1);
        expect(options.maxConcurrency).toEqual(5);
        expect(options.allowedDomains).toEqual(['www.microsoft.com']);
        expect(options.obeyRobotsTxt).toEqual(false);
        expect(options.retryCount).toEqual(1);
    });
});
