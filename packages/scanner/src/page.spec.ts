// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable:no-import-side-effect no-unnecessary-class
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { AxePuppeteer } from 'axe-puppeteer';
import * as Puppeteer from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';

import { ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { WebDriver } from 'service-library';
import { AxeScanResults } from './axe-scan-results';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { Page, PuppeteerBrowserFactory } from './page';

class PuppeteerPageMock {
    private readonly expectedViewPortSetting: Puppeteer.Viewport = {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
    };

    private viewPortSettingInvoked = false;

    constructor(
        private readonly gotoMock: (url: string, options: Puppeteer.DirectNavigationOptions) => Promise<Puppeteer.Response>,
        private readonly waitForNavigationMock: (options?: Puppeteer.NavigationOptions) => Promise<Puppeteer.Response>,
        private readonly setBypassCSPMock: (enabled: boolean) => Promise<void>,
    ) {}

    public async goto(url: string, options: Puppeteer.DirectNavigationOptions): Promise<Puppeteer.Response> {
        if (this.viewPortSettingInvoked !== true) {
            throw new Error('viewport should be set before navigation');
        }

        return this.gotoMock(url, options);
    }

    public async waitForNavigation(options?: Puppeteer.NavigationOptions): Promise<Puppeteer.Response> {
        return this.waitForNavigationMock(options);
    }

    public async setBypassCSP(enabled: boolean): Promise<void> {
        return this.setBypassCSPMock(enabled);
    }

    public async setViewport(viewport: Puppeteer.Viewport): Promise<void> {
        expect(viewport).toEqual(this.expectedViewPortSetting);
        this.viewPortSettingInvoked = true;
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
    let gotoOptions: Puppeteer.DirectNavigationOptions;
    let waitOptions: Puppeteer.DirectNavigationOptions;

    beforeEach(() => {
        gotoOptions = {
            waitUntil: ['load' as Puppeteer.LoadEvent],
        };
        waitOptions = {
            waitUntil: ['networkidle0' as Puppeteer.LoadEvent],
            timeout: 15000,
        };
        gotoMock = Mock.ofInstance((url: string, options: Puppeteer.DirectNavigationOptions) => {
            return undefined;
        });
        waitForNavigationMock = Mock.ofInstance((options?: Puppeteer.NavigationOptions) => {
            return undefined;
        });
        setBypassCSPMock = Mock.ofInstance((enabled: boolean) => {
            return undefined;
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
            // tslint:disable-next-line: no-any
        } as any;

        gotoMock
            .setup(async goto => goto(scanUrl, gotoOptions))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        waitForNavigationMock.setup(async wait => wait(waitOptions)).verifiable(Times.once());

        axePuppeteerMock.setup(async o => o.analyze()).verifiable(Times.never());
        axePuppeteerFactoryMock
            .setup(async apfm => apfm.createAxePuppeteer(page.puppeteerPage))
            .returns(async () => Promise.resolve(axePuppeteerMock.object))
            .verifiable(Times.once());

        await page.create();
        const result = await page.scanForA11yIssues(scanUrl);

        expect(result).toEqual(errorResult);
    });

    it('should analyze accessibility issues, even if error thrown when waitForNavigation', async () => {
        const scanUrl = 'https://www.example.com';
        const axeResults: AxeResults = createEmptyAxeResults(scanUrl);
        const scanResults: AxeScanResults = { results: axeResults };
        const response: Puppeteer.Response = {
            headers: () => {
                return { 'content-type': 'text/html' };
            },
            // tslint:disable-next-line: no-any
        } as any;
        gotoMock
            .setup(async goto => goto(scanUrl, gotoOptions))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        waitForNavigationMock
            .setup(async wait => wait(waitOptions))
            .returns(async () => {
                throw new Error('network timed out');
            })
            .verifiable(Times.once());

        axePuppeteerFactoryMock
            // tslint:disable-next-line: no-unsafe-any
            .setup(async o => o.createAxePuppeteer(It.isAny()))
            // tslint:disable-next-line: no-any
            .returns(async () => Promise.resolve({ analyze: async () => Promise.resolve(axeResults) } as any))
            .verifiable(Times.once());

        await page.create();
        const result = await page.scanForA11yIssues(scanUrl);

        axePuppeteerFactoryMock.verifyAll();
        axePuppeteerMock.verifyAll();

        expect(result).toEqual(scanResults);
    });

    it('should create new browser page', async () => {
        await page.create();
        expect(page.puppeteerPage).toEqual(puppeteerBrowserMock.puppeteerPage);
        puppeteerBrowserFactory.verifyAll();
    });

    it('should call setBypassCSP', async () => {
        setBypassCSPMock.setup(async setBypassCSP => setBypassCSP(true)).verifiable(Times.once());

        await page.create();
        await page.enableBypassCSP();
        expect(page.puppeteerPage).toEqual(puppeteerBrowserMock.puppeteerPage);
        setBypassCSPMock.verifyAll();
    });

    it.skip('validates scanning in dev box', async () => {
        const webDriver = new WebDriver(Mock.ofType(Logger).object);
        const browser = await webDriver.launch();
        const getBrowser = () => {
            return browser;
        };
        page = new Page(getBrowser, new AxePuppeteerFactory(new ServiceConfiguration()));

        await page.create();

        await page.enableBypassCSP();

        const results = await page.scanForA11yIssues('https://tinyurl.com/mrhd5x');

        let violationCount = 0;
        results.results.violations.map(v => {
            violationCount += v.nodes.length;
        });

        console.log('violations count >>>', violationCount);
        console.log(results);
    }, 50000);

    it('should add the redirected url to results', async () => {
        // tslint:disable-next-line: no-object-literal-type-assertion
        const axeResults = createEmptyAxeResults('https://www.redirect-to.com');
        const scanUrl = 'https://www.redirect-from.com';
        const scanResults: AxeScanResults = {
            results: axeResults,
            redirectedToUrl: scanUrl,
        };
        const response: Puppeteer.Response = {
            headers: () => {
                return { 'content-type': 'text/html' };
            },
            // tslint:disable-next-line: no-any
        } as any;
        gotoMock
            .setup(async goto => goto(scanUrl, gotoOptions))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        waitForNavigationMock.setup(async wait => wait(waitOptions)).verifiable(Times.once());

        axePuppeteerFactoryMock
            // tslint:disable-next-line: no-unsafe-any
            .setup(async o => o.createAxePuppeteer(It.isAny()))
            // tslint:disable-next-line: no-any
            .returns(async () => Promise.resolve({ analyze: async () => Promise.resolve(axeResults) } as any))
            .verifiable(Times.once());

        await page.create();
        const result = await page.scanForA11yIssues(scanUrl);

        axePuppeteerFactoryMock.verifyAll();
        axePuppeteerMock.verifyAll();

        expect(result).toEqual(scanResults);
    });
});

function createEmptyAxeResults(url: string): AxeResults {
    // tslint:disable-next-line: no-object-literal-type-assertion
    return { url: url } as AxeResults;
}
