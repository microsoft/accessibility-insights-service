import { Context } from '@azure/functions';
import { IncomingMessage } from 'http';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';

import { ScanRequest } from '../common/data-contract';
import { LinkedUrlFinder } from './linked-url-finder';
import { CrawlRequest, QueueItem, SimpleCrawlerTyped } from './simple-crawler';

//tslint:disable no-unsafe-any

describe('LinkUrlFinder', () => {
    let simpleCrawlerMock: IMock<SimpleCrawlerTyped>;
    let crawlRequest: CrawlRequest;
    let contextStub: Context;
    const scanUrl = 'https://www.bing.com';
    let completeCallback: Function;
    let fetchCompleteCallback: Function;
    let fetchConditionCallback: Function;
    let contentTypeResponseMock: IMock<IncomingMessage>;

    beforeEach(() => {
        simpleCrawlerMock = Mock.ofType<SimpleCrawlerTyped>(undefined, MockBehavior.Strict);
        simpleCrawlerMock.setup(sc => (sc.maxDepth = It.isValue(1)));
        simpleCrawlerMock.setup(sc => (sc.maxConcurrency = It.isValue(5)));
        simpleCrawlerMock.setup(sc => (sc.interval = It.isValue(1000)));
        simpleCrawlerMock.setup(sc => sc.start()).verifiable(Times.once());
        contentTypeResponseMock = Mock.ofType<IncomingMessage>();
        setupCrawlerListeners();
        //tslint:disable-next-line: no-object-literal-type-assertion no-empty no-any
        contextStub = { bindings: {}, log: (() => {}) as any } as Context;
        crawlRequest = {
            id: '25714f70-ada0-45ff-bfd8-e8a9d5a330ba',
            name: 'Azure',
            baseUrl: 'https://azure.microsoft.com/',
            serviceTreeId: '7b566547-5e77-428b-853b-059300addeda',
        };
    });

    it('setup should work with params', () => {
        const testSubject = new LinkedUrlFinder(simpleCrawlerMock.object, crawlRequest);

        //tslint:disable-next-line: no-floating-promises
        testSubject.find(contextStub);

        expect(fetchConditionCallback).not.toBeNull();
        expect(completeCallback).not.toBeNull();
        simpleCrawlerMock.verifyAll();
    });
    test.each([createQueueItem('https://www.bing.com'), createQueueItem('https://www.bing.com/abc.html')])(
        'should return true for valid fetch condition for url %o',
        (testcase: string) => {
            const newObj = new LinkedUrlFinder(simpleCrawlerMock.object, crawlRequest);

            //tslint:disable-next-line: no-floating-promises
            newObj.find(contextStub);

            expect(fetchConditionCallback(testcase)).toBe(true);
        },
    );
    test.each(getNotAllowedUrls())('should return false for invalid fetch condition for url %o', (testcase: string) => {
        const newObj = new LinkedUrlFinder(simpleCrawlerMock.object, crawlRequest);

        //tslint:disable-next-line: no-floating-promises
        newObj.find(contextStub);

        expect(fetchConditionCallback(testcase)).toBe(false);
    });

    it('should complete when no urls to scan', async () => {
        const testSubject = new LinkedUrlFinder(simpleCrawlerMock.object, crawlRequest);

        const completePromise = testSubject.find(contextStub);
        setupCompleteCallback();

        completeCallback();

        simpleCrawlerMock.verifyAll();
        expect(contextStub.bindings.outputQueueItem).toEqual([]);
        await expect(completePromise).resolves.toBeUndefined();
    });

    it('should complete when all urls are scanned', async () => {
        const testSubject = new LinkedUrlFinder(simpleCrawlerMock.object, crawlRequest);
        const completePromise = testSubject.find(contextStub);
        setupHtmlContentTypeMock();
        fetchCompleteCallback(createQueueItem('https://www.something.com'), undefined, contentTypeResponseMock.object);
        fetchCompleteCallback(createQueueItem('https://www.abcd.com'), undefined, contentTypeResponseMock.object);
        setupXmlContentTypeMock();
        fetchCompleteCallback(createQueueItem('https://www.xyz.com'), undefined, contentTypeResponseMock.object);
        setupCompleteCallback();

        completeCallback();

        simpleCrawlerMock.verifyAll();
        expect(contextStub.bindings.outputQueueItem).toEqual(getScanRequestData());
        await expect(completePromise).resolves.toBeUndefined();
    });

    function createQueueItem(pathUrl: string): QueueItem {
        return {
            path: pathUrl,
            url: pathUrl,
        };
    }
    function setupCompleteCallback(): void {
        simpleCrawlerMock.setup(sc => sc.stop()).verifiable();
        simpleCrawlerMock.setup(sc => sc.initialURL).returns(() => scanUrl);
    }
    function getScanRequestData(): ScanRequest[] {
        return [
            {
                id: crawlRequest.id,
                name: crawlRequest.name,
                baseUrl: crawlRequest.baseUrl,
                scanUrl: 'https://www.something.com',
                serviceTreeId: crawlRequest.serviceTreeId,
            },
            {
                id: crawlRequest.id,
                name: crawlRequest.name,
                baseUrl: crawlRequest.baseUrl,
                scanUrl: 'https://www.abcd.com',
                serviceTreeId: crawlRequest.serviceTreeId,
            },
        ] as ScanRequest[];
    }
    function getNotAllowedUrls(): QueueItem[] {
        return [
            createQueueItem('https://www.bing.com/abc.pdf'),
            createQueueItem('https://www.bing.com/abc.js'),
            createQueueItem('https://www.bing.com/abc.css'),
            createQueueItem('https://www.bing.com/abc.png'),
            createQueueItem('https://www.bing.com/abc.jpg'),
            createQueueItem('https://www.bing.com/abc.jpeg'),
            createQueueItem('https://www.bing.com/abc.gif'),
            createQueueItem('https://www.bing.com/abc.json'),
            createQueueItem('https://www.bing.com/abc.xml'),
            createQueueItem('https://www.bing.com/abc.exe'),
            createQueueItem('https://www.bing.com/abc.dmg'),
            createQueueItem('https://www.bing.com/abc.ico'),
            createQueueItem('https://www.bing.com/abc.txt'),
            createQueueItem('https://www.bing.com/abc.zip'),
            createQueueItem('https://www.bing.com/abc.war'),
            createQueueItem('https://www.bing.com/abc.rar'),
            createQueueItem('https://www.bing.com/abc.svg'),
        ];
    }
    function setupCrawlerListeners(): void {
        simpleCrawlerMock
            .setup(sc => sc.on('complete', It.isAny()))
            .callback((eventName, callback) => {
                completeCallback = callback;
            });
        simpleCrawlerMock.setup(sc => sc.on('crawlstart', It.isAny()));
        simpleCrawlerMock.setup(sc => sc.on('queueerror', It.isAny()));
        simpleCrawlerMock.setup(sc => sc.on('fetchdataerror', It.isAny()));

        simpleCrawlerMock
            .setup(sc => sc.on('fetchcomplete', It.isAny()))
            .callback((eventName, callback) => {
                fetchCompleteCallback = callback;
            });
        simpleCrawlerMock
            .setup(sc => sc.addFetchCondition(It.isAny()))
            .callback(callback => {
                fetchConditionCallback = callback;
            });
    }
    function setupXmlContentTypeMock(): void {
        // tslint:disable-next-line:no-any
        contentTypeResponseMock
            .setup(res => res.headers)
            .returns(() => {
                // tslint:disable-next-line:no-any
                return { 'content-type': 'text/xml; charset=utf-8' } as any;
            });
    }
    function setupHtmlContentTypeMock(): void {
        // tslint:disable-next-line:no-any
        contentTypeResponseMock
            .setup(res => res.headers)
            .returns(() => {
                // tslint:disable-next-line:no-any
                return { 'content-type': 'text/html; charset=utf-8' } as any;
            });
    }
});
