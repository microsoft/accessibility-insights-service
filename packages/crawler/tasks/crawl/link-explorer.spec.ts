import { IMock, It, Mock } from 'typemoq';
import {
    createCrawlerRequestOptions,
    createCrawlResult,
    getNotAllowedUrls,
    getPromisableDynamicMock,
} from '../../test-utilities/common-mock-methods';
import { HCCrawlerTyped } from './hc-crawler';
import { HCCrawlerFactory } from './hc-crawler-factory';
import { CrawlerLaunchOptions, CrawlerRequestOptions } from './hc-crawler-types';
import { LaunchOptionsFactory } from './launch-options-factory';
import { LinkExplorer } from './link-explorer';

//tslint:disable no-unsafe-any

describe('LinkExplorer', () => {
    let crawlerFactoryMock: IMock<HCCrawlerFactory>;
    let launchOptionsFactoryMock: IMock<LaunchOptionsFactory>;
    let crawlerMock: IMock<HCCrawlerTyped>;
    let linkExplorer: LinkExplorer;
    let launchOptionsStub: CrawlerLaunchOptions;
    const testUrl = 'https://www.microsoft.com';
    const invalidUrl = 'https://www.xyzxyz.com';
    beforeEach(() => {
        crawlerFactoryMock = Mock.ofType<HCCrawlerFactory>();
        launchOptionsFactoryMock = Mock.ofType<LaunchOptionsFactory>();

        crawlerMock = Mock.ofType<HCCrawlerTyped>();
        crawlerMock.setup(async cm => cm.onIdle()).returns(async () => Promise.resolve());
        crawlerMock.setup(async cm => cm.close()).returns(async () => Promise.resolve());

        crawlerMock = getPromisableDynamicMock(crawlerMock);
        launchOptionsStub = new LaunchOptionsFactory().create(testUrl);
        linkExplorer = new LinkExplorer(crawlerFactoryMock.object, launchOptionsFactoryMock.object);
        setUpLaunchOptions();
        setUpCrawlerMockCreation();
    });

    it('should create instance', () => {
        expect(linkExplorer).not.toBeNull();
    });

    it('should explore link from valid url', async () => {
        const reqOptions: CrawlerRequestOptions = createCrawlerRequestOptions(testUrl);
        setUpCrawlerQueueForValidUrl(testUrl, launchOptionsStub, reqOptions);
        const exploreLinks: string[] = await linkExplorer.exploreLinks(testUrl);
        expect(exploreLinks.length).toBeGreaterThan(0);
        crawlerMock.verifyAll();
    });

    it('should throw error for an non existing web portal', async () => {
        const reqOptions: CrawlerRequestOptions = createCrawlerRequestOptions(invalidUrl);
        setUpCrawlerQueueForInValidUrl(invalidUrl, launchOptionsStub, reqOptions);
        const explorerPromise = linkExplorer.exploreLinks(invalidUrl);

        const errorMessage = `Explorer did not explore any links originated from ${invalidUrl}`;
        await expect(explorerPromise).rejects.toEqual(new Error(errorMessage));
        crawlerMock.verifyAll();
    });

    test.each(getNotAllowedUrls())('should not explore link from unsupported urls %o', async (urlToExplore: string) => {
        const reqOptions: CrawlerRequestOptions = createCrawlerRequestOptions(urlToExplore);
        setUpCrawlerQueueForSkipUrl(urlToExplore, launchOptionsStub, reqOptions);
        const explorerPromise = linkExplorer.exploreLinks(urlToExplore);
        const errorMessage = `Explorer did not explore any links originated from ${urlToExplore}`;
        await expect(explorerPromise).rejects.toEqual(new Error(errorMessage));
        crawlerMock.verifyAll();
    });

    function setUpCrawlerQueueForValidUrl(
        url: string,
        launchOptions: CrawlerLaunchOptions,
        crawlerReqOptions: CrawlerRequestOptions,
    ): void {
        crawlerMock
            .setup(async cm => cm.queue(url))
            .returns(async () => {
                launchOptions.preRequest(crawlerReqOptions);
                launchOptions.onSuccess(createCrawlResult(url));
                // tslint:disable-next-line: no-floating-promises
                Promise.resolve();
            });
    }

    function setUpCrawlerQueueForSkipUrl(url: string, launchOptions: CrawlerLaunchOptions, reqOptions: CrawlerRequestOptions): void {
        crawlerMock
            .setup(async cm => cm.queue(url))
            .returns(async () => {
                launchOptions.preRequest(reqOptions);
                // tslint:disable-next-line: no-floating-promises
                Promise.resolve();
            });
    }

    function setUpCrawlerQueueForInValidUrl(
        url: string,
        launchOptions: CrawlerLaunchOptions,
        crawlerReqOptions: CrawlerRequestOptions,
    ): void {
        crawlerMock
            .setup(async cm => cm.queue(url))
            .returns(async () => {
                launchOptions.preRequest(crawlerReqOptions);
                launchOptions.onError({ options: crawlerReqOptions, depth: 1, previousUrl: url });
                // tslint:disable-next-line: no-floating-promises
                Promise.resolve();
            });
    }

    function setUpCrawlerMockCreation(): void {
        crawlerFactoryMock.setup(async x => x.createInstance(It.isAny())).returns(async () => Promise.resolve(crawlerMock.object));
    }

    function setUpLaunchOptions(): void {
        launchOptionsFactoryMock
            .setup(x => x.create(It.isAny()))
            .returns(() => {
                return launchOptionsStub;
            });
    }
});
