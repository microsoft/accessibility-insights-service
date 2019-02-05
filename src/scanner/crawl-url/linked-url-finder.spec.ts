import { Context } from '@azure/functions';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';

import { LinkedUrlFinder } from './linked-url-finder';
import { QueueItem, SimpleCrawlerTyped } from './simple-crawler';

describe('Crawler', () => {
    let simpleCrawlerMock: IMock<SimpleCrawlerTyped>;
    let contextStub: Context;
    const scanUrl = 'https://www.bing.com';
    let completeCallback: Function;
    let fetchCompleteCallback: Function;
    let fetchConditionCallback: Function;

    beforeEach(() => {
        simpleCrawlerMock = Mock.ofType<SimpleCrawlerTyped>(undefined, MockBehavior.Strict);
        simpleCrawlerMock.setup(sc => (sc.maxDepth = It.isValue(1)));
        simpleCrawlerMock.setup(sc => (sc.maxConcurrency = It.isValue(5)));
        simpleCrawlerMock.setup(sc => (sc.interval = It.isValue(1000)));
        simpleCrawlerMock.setup(sc => sc.start()).verifiable(Times.once());
        setupCrawlerListeners();
        //tslint:disable-next-line: no-object-literal-type-assertion no-any no-empty
        contextStub = { bindings: {}, log: (() => {}) as any } as Context;
    });

    it('setup should work with params', () => {
        const testSubject = new LinkedUrlFinder(simpleCrawlerMock.object);
        testSubject.find(contextStub, scanUrl);
        expect(fetchConditionCallback).not.toBeNull();
        expect(completeCallback).not.toBeNull();
        simpleCrawlerMock.verifyAll();
    });
    test.each([createQueueItem('https://www.bing.com'), createQueueItem('https://www.bing.com/abc.html')])(
        'should return true for valid fetch condition for url %o',
        (testcase: string) => {
            const newObj = new LinkedUrlFinder(simpleCrawlerMock.object);
            newObj.find(contextStub, scanUrl);
            expect(fetchConditionCallback(testcase)).toBe(true);
        },
    );
    test.each(getNotAllowedUrls())('should return false for invalid fetch condition for url %o', (testcase: string) => {
        const newObj = new LinkedUrlFinder(simpleCrawlerMock.object);
        newObj.find(contextStub, scanUrl);
        expect(fetchConditionCallback(testcase)).toBe(false);
    });

    it('should complete when no urls to scan', async () => {
        const testSubject = new LinkedUrlFinder(simpleCrawlerMock.object);
        const completePromise = testSubject.find(contextStub, scanUrl);
        setupCompleteCallback();
        completeCallback();
        simpleCrawlerMock.verifyAll();
        expect(contextStub.bindings.outputQueueItem).toEqual([]);
        await expect(completePromise).resolves.toBeUndefined();
    });

    it('should complete when all urls are scanned', async () => {
        const testSubject = new LinkedUrlFinder(simpleCrawlerMock.object);
        const completePromise = testSubject.find(contextStub, scanUrl);
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
