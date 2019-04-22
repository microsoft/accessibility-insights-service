// tslint:disable: no-object-literal-type-assertion
import 'reflect-metadata';

import * as Puppeteer from 'puppeteer';
import { IMock, Mock, Times } from 'typemoq';
import { HCCrawler, HCCrawlerTyped } from '../crawler/hc-crawler';
import { HCCrawlerOptionsFactory } from '../crawler/hc-crawler-options-factory';
import { CrawlerConnectOptions } from '../crawler/hc-crawler-types';
import { LinkExplorer } from '../crawler/link-explorer';
import { CrawlerTask, LinkExplorerFactory } from './crawler-task';

type HCCrawlerConnect = (options: CrawlerConnectOptions) => Promise<HCCrawlerTyped>;

class BrowserMock {
    public wsEndpoint(): string {
        return 'wsEndpoint';
    }
}

let browserMock: BrowserMock;
let hcCrawlerOptionsFactoryMock: IMock<HCCrawlerOptionsFactory>;
let linkExplorerFactoryMock: IMock<LinkExplorerFactory>;
let hcCrawlerConnectMock: IMock<HCCrawlerConnect>;
let hcCrawlerTyped: HCCrawlerTyped;
let linkExplorerMock: IMock<LinkExplorer>;
let crawlerTask: CrawlerTask;

beforeEach(() => {
    browserMock = new BrowserMock();
    hcCrawlerTyped = <HCCrawlerTyped>{};
    hcCrawlerOptionsFactoryMock = Mock.ofType<HCCrawlerOptionsFactory>();
    linkExplorerFactoryMock = Mock.ofType<LinkExplorerFactory>();
    hcCrawlerConnectMock = Mock.ofType<HCCrawlerConnect>();
    linkExplorerMock = Mock.ofType<LinkExplorer>();
    HCCrawler.connect = hcCrawlerConnectMock.object;
    crawlerTask = new CrawlerTask(hcCrawlerOptionsFactoryMock.object, linkExplorerFactoryMock.object);
});

describe('CrawlerTask', () => {
    it('crawl website page', async () => {
        const crawlerConnectOptions = { browserWSEndpoint: 'wsEndpoint' };
        const linkExplorerResult = { error: 'link explorer result' };
        hcCrawlerOptionsFactoryMock
            .setup(o => o.createConnectOptions('url', 'wsEndpoint'))
            .returns(() => <CrawlerConnectOptions>(<unknown>crawlerConnectOptions))
            .verifiable(Times.once());
        hcCrawlerConnectMock
            .setup(async o => o(<CrawlerConnectOptions>(<unknown>crawlerConnectOptions)))
            .returns(async () => Promise.resolve(hcCrawlerTyped))
            .verifiable(Times.once());
        linkExplorerFactoryMock
            .setup(o => o(hcCrawlerTyped, <CrawlerConnectOptions>(<unknown>crawlerConnectOptions)))
            .returns(() => linkExplorerMock.object)
            .verifiable(Times.once());
        linkExplorerMock
            .setup(async o => o.exploreLinks('url'))
            .returns(async () => Promise.resolve(linkExplorerResult))
            .verifiable(Times.once());

        const result = await crawlerTask.crawl('url', <Puppeteer.Browser>(<unknown>browserMock));

        expect(result).toEqual(linkExplorerResult);
        hcCrawlerOptionsFactoryMock.verifyAll();
        hcCrawlerConnectMock.verifyAll();
        linkExplorerFactoryMock.verifyAll();
        linkExplorerMock.verifyAll();
    });
});
