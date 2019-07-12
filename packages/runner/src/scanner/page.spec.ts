// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable:no-import-side-effect no-unnecessary-class
import 'reflect-metadata';
import '../../test-utilities/common-mock-methods';

import { AxePuppeteer } from 'axe-puppeteer';
import * as Puppeteer from 'puppeteer';
import { IMock, Mock, Times, It } from 'typemoq';
import { AxePuppeteerFactory, Page, PuppeteerBrowserFactory } from './page';
import { AxeScanResults } from './axe-scan-results';
import { AxeResults } from 'axe-core';

class PuppeteerPageMock {
    constructor(
        private gotoMock: (url: string, options: Puppeteer.DirectNavigationOptions) => Promise<Puppeteer.Response>,
        private waitForNavigationMock: (options?: Puppeteer.NavigationOptions) => Promise<Puppeteer.Response>,
        private setBypassCSPMock: (enabled: boolean) => Promise<void>,
    ) {}
    public goto(url: string, options: Puppeteer.DirectNavigationOptions): Promise<Puppeteer.Response> {
        return this.gotoMock(url, options);
    }

    public waitForNavigation(options?: Puppeteer.NavigationOptions): Promise<Puppeteer.Response> {
        return this.waitForNavigationMock(options);
    }

    public setBypassCSP(enabled: boolean): Promise<void> {
        return this.setBypassCSPMock(enabled);
    }
}

class PuppeteerBrowserMock {
    constructor(public readonly puppeteerPage: PuppeteerPageMock) {}

    public async newPage(): Promise<Puppeteer.Page> {
        return Promise.resolve(<Puppeteer.Page>(<unknown>this.puppeteerPage));
    }
}

describe('Page', () => {
    let gotoMock: IMock<(url: string, options: Puppeteer.DirectNavigationOptions) => Promise<Puppeteer.Response>>;
    let waitForNavigationMock: IMock<(options?: Puppeteer.DirectNavigationOptions) => Promise<Puppeteer.Response>>;
    let setBypassCSPMock: IMock<(enabled: boolean) => Promise<void>>;
    let puppeteerPageMock: PuppeteerPageMock;
    let axePuppeteerFactoryMock: IMock<AxePuppeteerFactory>;
    let puppeteerBrowserFactory: IMock<PuppeteerBrowserFactory>;
    let axePuppeteerMock: IMock<AxePuppeteer>;
    let puppeteerBrowserMock: PuppeteerBrowserMock;
    let page: Page;

    beforeEach(() => {
        gotoMock = Mock.ofInstance((url: string, options: Puppeteer.DirectNavigationOptions) => {
            return null;
        });
        waitForNavigationMock = Mock.ofInstance((options?: Puppeteer.NavigationOptions) => {
            return null;
        });
        setBypassCSPMock = Mock.ofInstance((enabled: boolean) => {
            return null;
        });

        puppeteerPageMock = new PuppeteerPageMock(gotoMock.object, waitForNavigationMock.object, setBypassCSPMock.object);
        axePuppeteerFactoryMock = Mock.ofType<AxePuppeteerFactory>();
        puppeteerBrowserFactory = Mock.ofType<PuppeteerBrowserFactory>();
        axePuppeteerMock = Mock.ofType<AxePuppeteer>();
        puppeteerBrowserMock = new PuppeteerBrowserMock(puppeteerPageMock);
        puppeteerBrowserFactory
            .setup(o => o())
            .returns(() => <Puppeteer.Browser>(<unknown>puppeteerBrowserMock))
            .verifiable(Times.once());
        page = new Page(puppeteerBrowserFactory.object, axePuppeteerFactoryMock.object);
    });

    it('should return error info when page is not html', async () => {
        const scanUrl = 'https://www.non-html-url.com';
        const errorResult: AxeScanResults = {
            error: `Cannot scan ${scanUrl} because it is not a html page.`,
            unscannable: true,
        };
        const response: Puppeteer.Response = {
            headers: () => {
                return { 'content-type': 'text/plain' };
            },
        } as any;
        const options: Puppeteer.DirectNavigationOptions = {
            waitUntil: ['load' as Puppeteer.LoadEvent],
        };
        gotoMock
            .setup(async goto => goto(scanUrl, options))
            .returns(async () => Promise.resolve(response as Puppeteer.Response))
            .verifiable(Times.once());
        waitForNavigationMock.setup(async wait => wait(It.isAny())).verifiable(Times.once());

        axePuppeteerMock.setup(async o => o.analyze()).verifiable(Times.never());
        axePuppeteerFactoryMock
            .setup(apfm => apfm(page.puppeteerPage))
            .returns(() => axePuppeteerMock.object)
            .verifiable(Times.once());

        await page.create();
        const result = await page.scanForA11yIssues(scanUrl);

        expect(result).toEqual(errorResult);
    });

    it('should analyze accessibility issues, even if error thrwon when waitForNavigation', async () => {
        const axeResults: AxeResults = <AxeResults>(<unknown>{ type: 'AxeResults' });
        const scanResults: AxeScanResults = { results: axeResults };
        const scanUrl = 'https://www.example.com';
        const response: Puppeteer.Response = {
            headers: () => {
                return { 'content-type': 'text/html' };
            },
        } as any;
        gotoMock
            .setup(async goto => goto(scanUrl, It.isAny()))
            .returns(async () => Promise.resolve(response as Puppeteer.Response))
            .verifiable(Times.once());
        waitForNavigationMock
            .setup(async wait => wait(It.isAny()))
            .returns(async () => {
                throw new Error('network timed out');
            })
            .verifiable(Times.once());

        axePuppeteerMock
            .setup(async o => o.analyze())
            .returns(async () => Promise.resolve(axeResults))
            .verifiable(Times.once());
        axePuppeteerFactoryMock
            .setup(o => o(It.isAny()))
            .returns(() => axePuppeteerMock.object)
            .verifiable(Times.once());

        await page.create();
        const result = await page.scanForA11yIssues(scanUrl);

        expect(result).toEqual(scanResults);
        axePuppeteerMock.verifyAll();
        axePuppeteerFactoryMock.verifyAll();
    });

    it('should create new browser page', async () => {
        await page.create();
        expect(page.puppeteerPage).toEqual(puppeteerBrowserMock.puppeteerPage);
        puppeteerBrowserFactory.verifyAll();
    });

    it('should call setBypassCSP', async () => {
        setBypassCSPMock.setup(set => set(true)).verifiable(Times.once());

        await page.create();
        await page.enableBypassCSP();
        expect(page.puppeteerPage).toEqual(puppeteerBrowserMock.puppeteerPage);
        setBypassCSPMock.verifyAll();
    });
});
