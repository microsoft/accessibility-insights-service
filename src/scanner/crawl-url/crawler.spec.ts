import { Context } from '@azure/functions';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';

import { Crawler } from './crawler';
import { getCrawler, QueueItem, SimpleCrawler } from './simple-crawler';

describe('Crawler', () => {
    let getCrawlerMock: IMock<typeof getCrawler>;
    let simpleCrawlerMock: IMock<SimpleCrawler>;
    let contextStub: Context;
    const scanUrl = 'https://www.bing.com';
    let completeCallback: Function;
    let fetchCompleteCallback: Function;
    let fetchConditionCallback: Function;

    beforeEach(() => {
        simpleCrawlerMock = Mock.ofType<SimpleCrawler>(undefined, MockBehavior.Strict);
        simpleCrawlerMock.setup(sc => (sc.maxDepth = It.isValue(1)));
        simpleCrawlerMock.setup(sc => (sc.maxConcurrency = It.isValue(5)));
        simpleCrawlerMock.setup(sc => (sc.interval = It.isValue(1000)));
        simpleCrawlerMock.setup(sc => sc.start()).verifiable(Times.once());
        setupCrawlerListeners();
        //tslint:disable-next-line: no-object-literal-type-assertion no-any no-empty
        contextStub = { bindings: {}, log: (() => {}) as any } as Context;
        getCrawlerMock = Mock.ofType<typeof getCrawler>();
        getCrawlerMock.setup(gc => gc(scanUrl)).returns(() => simpleCrawlerMock.object);
    });

    it('setup should work with params', () => {
        const testSubject = new Crawler(getCrawlerMock.object);
        testSubject.crawl(contextStub, scanUrl);
        expect(fetchConditionCallback).not.toBeNull();
        expect(completeCallback).not.toBeNull();
        simpleCrawlerMock.verifyAll();
    });
    // tslint:disable-next-line: mocha-no-side-effect-code
    test.each([createQueueItem('https://www.bing.com'), createQueueItem('https://www.bing.com/abc.html')])(
        'should return true for valid fetch condition for url %o',
        (testcase: string) => {
            const newObj = new Crawler(getCrawlerMock.object);
            newObj.crawl(contextStub, scanUrl);
            expect(fetchConditionCallback(testcase)).toBe(true);
        },
    );

    // tslint:disable-next-line: mocha-no-side-effect-code
    test.each(getNotAllowedUrls())('should return false for invalid fetch condition for url %o', (testcase: string) => {
        const newObj = new Crawler(getCrawlerMock.object);
        newObj.crawl(contextStub, scanUrl);
        expect(fetchConditionCallback(testcase)).toBe(false);
    });

    it('should complete when no urls to scan', async () => {
        const testSubject = new Crawler(getCrawlerMock.object);
        const completePromise = testSubject.crawl(contextStub, scanUrl);
        setupCompleteCallback();
        completeCallback();
        simpleCrawlerMock.verifyAll();
        expect(contextStub.bindings.outputQueueItem).toEqual([]);
        await expect(completePromise).resolves.toBeUndefined();
    });

    it('should complete when all urls are scanned', async () => {
        const testSubject = new Crawler(getCrawlerMock.object);
        const completePromise = testSubject.crawl(contextStub, scanUrl);
        fetchCompleteCallback(createQueueItem('https://www.something.com'));
        fetchCompleteCallback(createQueueItem('https://www.abcd.com'));
        setupCompleteCallback();
        completeCallback();
        simpleCrawlerMock.verifyAll();
        expect(contextStub.bindings.outputQueueItem).toEqual(['https://www.something.com', 'https://www.abcd.com']);
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
});
