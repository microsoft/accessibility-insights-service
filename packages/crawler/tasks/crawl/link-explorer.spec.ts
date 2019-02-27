import { IMock, It, Mock } from 'typemoq';
import { HCCrawlerTyped } from './hc-crawler';
import { HCCrawlerFactory } from './hc-crawler-factory';
import { HCCrawlerError, HCCrawlerLaunchOptions, HCCrawlerRequestOptions, HCCrawlerResult } from './hc-crawler-types';
import { LaunchOptionsFactory } from './launch-options-factory';
import { LinkExplorer } from './link-explorer';

//tslint:disable no-unsafe-any

describe('LinkExplorer', () => {
    let crawlerFactoryMock: IMock<HCCrawlerFactory>;
    let launchOptionsFactoryMock: IMock<LaunchOptionsFactory>;
    let crawlerMock: IMock<HCCrawlerTyped>;
    let linkExplorer: LinkExplorer;
    let launchOptionsStub: HCCrawlerLaunchOptions;
    const testUrl = 'https://www.microsoft.com';
    const invalidUrl = 'https://www.asasassasa.com';
    let onSuccessFunc: (result: HCCrawlerResult) => void;
    let preRequestFunc: (options: HCCrawlerRequestOptions) => boolean;
    let onErrorFunc: (error: HCCrawlerError) => void;
    let requestStartEventCallback: (options: HCCrawlerRequestOptions) => void;
    let requestFinishedEventCallback: (options: HCCrawlerRequestOptions) => void;
    let requestSkippedEventCallback: (options: HCCrawlerRequestOptions) => void;
    let requestFailedEventCallback: (error: Error) => void;
    //let createCrawlerPromise: Promise<HCCrawlerTyped>;

    beforeEach(() => {
        crawlerFactoryMock = Mock.ofType<HCCrawlerFactory>();
        launchOptionsFactoryMock = Mock.ofType<LaunchOptionsFactory>();

        crawlerMock = Mock.ofType<HCCrawlerTyped>();
        crawlerMock.setup(async cm => cm.onIdle()).returns(async () => Promise.resolve());
        crawlerMock.setup(async cm => cm.close()).returns(async () => Promise.resolve());
        //createCrawlerPromise = Promise.resolve(crawlerMock.object);

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
        const reqOptions: HCCrawlerRequestOptions = createRequestOptions(testUrl);
        setUpCrawlerQueueForValidUrl(testUrl, reqOptions);
        const explorerPromise = linkExplorer.exploreLinks(testUrl);

        const shouldProceeed: boolean = preRequestFunc(reqOptions);
        onSuccessFunc(createCrawlResult(testUrl));

        expect(shouldProceeed).toEqual(true);
        await expect(explorerPromise).resolves.toBeUndefined();
    });

    it('should throw error for an non existing web portal', async () => {
        const reqOptions: HCCrawlerRequestOptions = createRequestOptions(testUrl);
        setUpCrawlerQueueForInValidUrl(invalidUrl, reqOptions);
        const explorerPromise = linkExplorer.exploreLinks(invalidUrl);

        const shouldProceeed: boolean = preRequestFunc(reqOptions);
        onErrorFunc({ options: undefined, depth: 1, previousUrl: invalidUrl });

        expect(shouldProceeed).toEqual(true);
        const errorMessage = `Explorer did not explore any links originated from ${invalidUrl}`;
        await expect(explorerPromise).rejects.toEqual(errorMessage);
    });

    test.each(getNotAllowedUrls())('should not explore link from unsupported urls %o', async (urlToExplore: string) => {
        const reqOptions: HCCrawlerRequestOptions = createRequestOptions(urlToExplore);
        setUpCrawlerQueueForSkipUrl(urlToExplore, reqOptions);
        const explorerPromise = linkExplorer.exploreLinks(urlToExplore);

        const shouldProceeed: boolean = preRequestFunc(reqOptions);
        const errorMessage = `Explorer did not explore any links originated from ${urlToExplore}`;
        expect(shouldProceeed).toEqual(false);
        await expect(explorerPromise).rejects.toEqual(errorMessage);
    });

    function setUpCrawlerQueueForValidUrl(url: string, reqOptions: HCCrawlerRequestOptions): void {
        crawlerMock
            .setup(async cm => cm.queue(url))
            .returns(async () => {
                requestStartEventCallback(reqOptions);
                requestFinishedEventCallback(reqOptions);
                // tslint:disable-next-line: no-floating-promises
                Promise.resolve();
            });
    }

    function setUpCrawlerQueueForSkipUrl(url: string, reqOptions: HCCrawlerRequestOptions): void {
        crawlerMock
            .setup(async cm => cm.queue(url))
            .returns(async () => {
                requestStartEventCallback(reqOptions);
                requestSkippedEventCallback(reqOptions);
                // tslint:disable-next-line: no-floating-promises
                Promise.resolve();
            });
    }

    function setUpCrawlerQueueForInValidUrl(url: string, reqOptions: HCCrawlerRequestOptions): void {
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
        onSuccessFunc = launchOptionsStub.onSuccess;
        onErrorFunc = launchOptionsStub.onError;
        preRequestFunc = launchOptionsStub.preRequest;
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

    function createRequestOptions(requestUrl: string): HCCrawlerRequestOptions {
        return {
            url: requestUrl,
        };
    }

    function createCrawlResult(requestUrl: string): HCCrawlerResult {
        return {
            depth: 1,
            options: {
                url: testUrl,
                maxDepth: 1,
                priority: 1,
                delay: 0,
                retryCount: 1,
                retryDelay: 0,
                timeout: 0,
                jQuery: false,
                skipDuplicates: true,
                depthPriority: false,
                obeyRobotsTxt: false,
                followSitemapXml: false,
                skipRequestedRedirect: true,
            },
            previousUrl: undefined,
            response: undefined,
            links: [],
        };
    }

    function getPromisableDynamicMock<T>(mock: IMock<T>): IMock<T> {
        // workaround for issue https://github.com/florinn/typemoq/issues/70

        // tslint:disable-next-line:no-any no-unsafe-any
        mock.setup((x: any) => x.then).returns(() => undefined);

        return mock;
    }
    function getNotAllowedUrls(): string[] {
        return [
            'https://www.bing.com/abc.pdf',
            'https://www.bing.com/abc.js',
            'https://www.bing.com/abc.css',
            'https://www.bing.com/abc.png',
            'https://www.bing.com/abc.jpg',
            'https://www.bing.com/abc.jpeg',
            'https://www.bing.com/abc.gif',
            'https://www.bing.com/abc.json',
            'https://www.bing.com/abc.xml',
            'https://www.bing.com/abc.exe',
            'https://www.bing.com/abc.dmg',
            'https://www.bing.com/abc.ico',
            'https://www.bing.com/abc.txt',
            'https://www.bing.com/abc.zip',
            'https://www.bing.com/abc.war',
            'https://www.bing.com/abc.rar',
            'https://www.bing.com/abc.svg',
        ];
    }
});
