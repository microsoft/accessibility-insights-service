import { IMock, It, Mock } from 'typemoq';
import {
    createCrawlerRequestOptions,
    createCrawlResult,
    getNotAllowedUrls,
    getPromisableDynamicMock,
} from '../test-utilities/common-mock-methods';
import { CrawlerScanResults } from './crawler-scan-results';
import { HCCrawlerTyped } from './hc-crawler';
import { HCCrawlerOptionsFactory } from './hc-crawler-options-factory';
import { CrawlerLaunchOptions, CrawlerRequestOptions } from './hc-crawler-types';
import { LinkExplorer } from './link-explorer';

//tslint:disable no-unsafe-any

describe('LinkExplorer', () => {
    let crawlerMock: IMock<HCCrawlerTyped>;
    let linkExplorer: LinkExplorer;
    let launchOptionsStub: CrawlerLaunchOptions;
    const testUrl = 'https://www.microsoft.com';
    const invalidUrl = 'https://www.xyzxyz.com';
    beforeEach(() => {
        // tslint:disable-next-line:no-any
        (global as any).isDebug = false;
        // tslint:disable-next-line:no-any no-empty
        (global as any).cout = () => {};
        crawlerMock = Mock.ofType<HCCrawlerTyped>();
        crawlerMock.setup(async cm => cm.onIdle()).returns(async () => Promise.resolve());
        crawlerMock.setup(async cm => cm.close()).returns(async () => Promise.resolve());

        crawlerMock = getPromisableDynamicMock(crawlerMock);
        launchOptionsStub = new HCCrawlerOptionsFactory().createConnectOptions(testUrl, It.isAny());
        linkExplorer = new LinkExplorer(crawlerMock.object, launchOptionsStub);
    });

    it('should create instance', () => {
        expect(linkExplorer).not.toBeNull();
    });

    it('should explore link from valid url', async () => {
        const reqOptions: CrawlerRequestOptions = createCrawlerRequestOptions(testUrl);
        setUpCrawlerQueueForValidUrl(testUrl, launchOptionsStub, reqOptions);
        const exploreResult: CrawlerScanResults = await linkExplorer.exploreLinks(testUrl);
        expect(exploreResult.results.length).toBeGreaterThan(0);
        crawlerMock.verifyAll();
    });

    it('should generate error for an non existing web portal', async () => {
        const reqOptions: CrawlerRequestOptions = createCrawlerRequestOptions(invalidUrl);
        setUpCrawlerQueueForInValidUrl(invalidUrl, launchOptionsStub, reqOptions);
        const explorerPromise = await linkExplorer.exploreLinks(invalidUrl);
        expect(explorerPromise.error).not.toBeNull();
        crawlerMock.verifyAll();
    });

    test.each(getNotAllowedUrls())('should not explore link from unsupported urls %o', async (urlToExplore: string) => {
        const reqOptions: CrawlerRequestOptions = createCrawlerRequestOptions(urlToExplore);
        setUpCrawlerQueueForSkipUrl(urlToExplore, launchOptionsStub, reqOptions);
        const explorerPromise = await linkExplorer.exploreLinks(urlToExplore);
        expect(explorerPromise.results.length).toEqual(0);
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
                launchOptions.onError({ options: crawlerReqOptions, depth: 1, previousUrl: url, name: It.isAny(), message: It.isAny() });
                // tslint:disable-next-line: no-floating-promises
                Promise.resolve();
            });
    }
});
