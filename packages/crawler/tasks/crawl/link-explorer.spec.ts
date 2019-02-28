import { IMock, It, Mock } from 'typemoq';
import { createCrawlerRequestOptions, getNotAllowedUrls, getPromisableDynamicMock } from '../../test-utilities/common-mock-methods';
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
    let requestStartEventCallback: (options: CrawlerRequestOptions) => void;
    let requestFinishedEventCallback: (options: CrawlerRequestOptions) => void;
    let requestSkippedEventCallback: (options: CrawlerRequestOptions) => void;
    let requestFailedEventCallback: (error: Error) => void;

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
        setUpCrawleEventrCallback();
    });

    it('should create instance', () => {
        expect(linkExplorer).not.toBeNull();
    });

    it('should explore link from valid url', async () => {
        const reqOptions: CrawlerRequestOptions = createCrawlerRequestOptions(testUrl);
        setUpCrawlerQueueForValidUrl(testUrl, reqOptions);
        const explorerPromise = linkExplorer.exploreLinks(testUrl);
        await expect(explorerPromise).resolves.toBeUndefined();
    });

    it('should throw error for an non existing web portal', async () => {
        const reqOptions: CrawlerRequestOptions = createCrawlerRequestOptions(testUrl);
        setUpCrawlerQueueForInValidUrl(invalidUrl, reqOptions);
        const explorerPromise = linkExplorer.exploreLinks(invalidUrl);

        const errorMessage = `Explorer did not explore any links originated from ${invalidUrl}`;
        await expect(explorerPromise).rejects.toEqual(errorMessage);
    });

    test.each(getNotAllowedUrls())('should not explore link from unsupported urls %o', async (urlToExplore: string) => {
        const reqOptions: CrawlerRequestOptions = createCrawlerRequestOptions(urlToExplore);
        setUpCrawlerQueueForSkipUrl(urlToExplore, reqOptions);
        const explorerPromise = linkExplorer.exploreLinks(urlToExplore);

        const errorMessage = `Explorer did not explore any links originated from ${urlToExplore}`;
        await expect(explorerPromise).rejects.toEqual(errorMessage);
    });

    function setUpCrawlerQueueForValidUrl(url: string, reqOptions: CrawlerRequestOptions): void {
        crawlerMock
            .setup(async cm => cm.queue(url))
            .returns(async () => {
                requestStartEventCallback(reqOptions);
                requestFinishedEventCallback(reqOptions);
                // tslint:disable-next-line: no-floating-promises
                Promise.resolve();
            });
    }

    function setUpCrawlerQueueForSkipUrl(url: string, reqOptions: CrawlerRequestOptions): void {
        crawlerMock
            .setup(async cm => cm.queue(url))
            .returns(async () => {
                requestStartEventCallback(reqOptions);
                requestSkippedEventCallback(reqOptions);
                // tslint:disable-next-line: no-floating-promises
                Promise.resolve();
            });
    }

    function setUpCrawlerQueueForInValidUrl(url: string, reqOptions: CrawlerRequestOptions): void {
        crawlerMock
            .setup(async cm => cm.queue(url))
            .returns(async () => {
                requestStartEventCallback(reqOptions);
                requestFailedEventCallback(new Error());
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
    function setUpCrawleEventrCallback(): void {
        crawlerMock
            .setup(cm => cm.on('requestfailed', It.isAny()))
            .callback((eventName, callback) => {
                requestFailedEventCallback = callback;
            });
        crawlerMock
            .setup(cm => cm.on('requestfinished', It.isAny()))
            .callback((eventName, callback) => {
                requestFinishedEventCallback = callback;
            });
        crawlerMock
            .setup(cm => cm.on('requeststarted', It.isAny()))
            .callback((eventName, callback) => {
                requestStartEventCallback = callback;
            });
        crawlerMock
            .setup(cm => cm.on('requestskipped', It.isAny()))
            .callback((eventName, callback) => {
                requestSkippedEventCallback = callback;
            });
    }
});
