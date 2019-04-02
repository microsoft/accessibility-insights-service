// tslint:disable:no-import-side-effect no-unnecessary-class
import 'reflect-metadata';
import '../test-utilities/common-mock-methods';

import { AxeResults } from 'axe-core';
import { AxePuppeteer } from 'axe-puppeteer';
import * as Puppeteer from 'puppeteer';
import { IMock, Mock, Times } from 'typemoq';
import { AxePuppeteerFactory, Page, PuppeteerBrowserFactory } from './page';

class PuppeteerPageMock {}

class PuppeteerBrowserMock {
    constructor(public readonly puppeteerPage: PuppeteerPageMock = new PuppeteerPageMock()) {}

    public async newPage(): Promise<Puppeteer.Page> {
        return Promise.resolve(<Puppeteer.Page>(<unknown>this.puppeteerPage));
    }
}

let axePuppeteerFactoryMock: IMock<AxePuppeteerFactory>;
let puppeteerBrowserFactory: IMock<PuppeteerBrowserFactory>;
let axePuppeteerMock: IMock<AxePuppeteer>;
let puppeteerBrowserMock: PuppeteerBrowserMock;
let page: Page;

beforeEach(() => {
    axePuppeteerFactoryMock = Mock.ofType<AxePuppeteerFactory>();
    puppeteerBrowserFactory = Mock.ofType<PuppeteerBrowserFactory>();
    axePuppeteerMock = Mock.ofType<AxePuppeteer>();
    puppeteerBrowserMock = new PuppeteerBrowserMock();
    puppeteerBrowserFactory
        .setup(o => o())
        .returns(() => <Puppeteer.Browser>(<unknown>puppeteerBrowserMock))
        .verifiable(Times.once());
    page = new Page(puppeteerBrowserFactory.object, axePuppeteerFactoryMock.object);
});

describe('Page', () => {
    it('should analyze accessibility issues', async () => {
        const axeResults: AxeResults = <AxeResults>(<unknown>{ type: 'AxeResults' });
        axePuppeteerMock
            .setup(async o => o.analyze())
            .returns(async () => Promise.resolve(axeResults))
            .verifiable(Times.once());
        axePuppeteerFactoryMock
            .setup(o => o(page.puppeteerPage))
            .returns(() => axePuppeteerMock.object)
            .verifiable(Times.once());

        const result = await page.scanForA11yIssues();

        expect(result).toEqual(axeResults);
        axePuppeteerMock.verifyAll();
        axePuppeteerFactoryMock.verifyAll();
    });

    it('should create new browser page', async () => {
        await page.create();
        expect(page.puppeteerPage).toEqual(puppeteerBrowserMock.puppeteerPage);
        puppeteerBrowserFactory.verifyAll();
    });
});
