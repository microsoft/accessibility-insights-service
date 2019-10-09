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
        const response: Puppeteer.Response = makeResponse({ contentType: 'text/plain' });

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
        const axeResults: AxeResults = <AxeResults>(<unknown>{ type: 'AxeResults' });
        const scanResults: AxeScanResults = { results: axeResults };
        const scanUrl = 'https://www.example.com';
        const response: Puppeteer.Response = makeResponse({});
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

    it('should return error info for non-successful status code', async () => {
        const scanUrl = 'https://www.error-url.com';
        const errorResult: AxeScanResults = {
            error: `The URL ${scanUrl} returned unsuccessful response: 500 status code text`,
        };
        const response: Puppeteer.Response = makeResponse({ statusCode: 500 });

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

    it.skip('validates scanning in dev box', async () => {
        const webDriver = new WebDriver(Mock.ofType(Logger).object);
        const browser = await webDriver.launch();
        const getBrowser = () => {
            return browser;
        };
        page = new Page(getBrowser, new AxePuppeteerFactory(new ServiceConfiguration()));

        await page.create();

        await page.enableBypassCSP();

        const results = await page.scanForA11yIssues('https://www.bing.com');

        let violationCount = 0;
        results.results.violations.map(v => {
            violationCount += v.nodes.length;
        });

        console.log('violations count >>>', violationCount);
        console.log(results);
    }, 50000);

    it('should identify errors thrown by goto', async () => {
        const scanUrl = 'https://www.problem-url.com';
        const errorResult: AxeScanResults = {
            error: `Puppeteer navigation to ${scanUrl} failed: unknown error`,
        };

        gotoMock
            .setup(async goto => goto(scanUrl, gotoOptions))
            .returns(async () => {
                throw new Error('unknown error');
            })
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
});

interface ResponseOptions {
    contentType?: string;
    statusCode?: number;
}

function makeResponse(options: ResponseOptions): Puppeteer.Response {
    const statusCode: number = options.statusCode === undefined ? 200 : options.statusCode;
    const contentType: string = options.contentType === undefined ? 'text/html' : options.contentType;

    return {
        headers: () => {
            return { 'content-type': contentType };
        },
        status: () => {
            return statusCode;
        },
        ok: () => {
            return statusCode >= 200 && statusCode < 300;
        },
        statusText: () => {
            return 'status code text';
        },
        // tslint:disable-next-line: no-any
    } as any;
}
