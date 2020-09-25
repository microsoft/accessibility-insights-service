// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
/* eslint-disable import/no-unassigned-import, @typescript-eslint/no-extraneous-class */
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { AxePuppeteer } from 'axe-puppeteer';
import * as Puppeteer from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import { AxePuppeteerFactory } from '../factories/axe-puppeteer-factory';
import { WebDriver } from '../web-driver/web-driver';
import { AxeScanResults, ScanErrorTypes } from './axe-scan-results';
import { Page } from './page';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

class PuppeteerBrowserMock {
    public static readonly browserVersion = 'browser version';

    constructor(public readonly puppeteerPage: PuppeteerPageMock) {}

    public async newPage(): Promise<Puppeteer.Page> {
        return Promise.resolve(<Puppeteer.Page>(<unknown>this.puppeteerPage));
    }

    public async version(): Promise<string> {
        return Promise.resolve(PuppeteerBrowserMock.browserVersion);
    }
}

class PuppeteerPageMock {
    public static readonly pageTitle = 'page title';

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
        private readonly pageContentMock: () => Promise<string>,
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

    public async title(): Promise<string> {
        return PuppeteerPageMock.pageTitle;
    }

    public async evaluate(): Promise<string> {
        return this.pageContentMock();
    }

    public async waitFor(duration: number): Promise<void> {
        return;
    }

    public async setUserAgent(userAgent: string): Promise<void> {
        return;
    }
}

describe('Page', () => {
    let gotoMock: IMock<(url: string, options: Puppeteer.DirectNavigationOptions) => Promise<Puppeteer.Response>>;
    let waitForNavigationMock: IMock<(options?: Puppeteer.DirectNavigationOptions) => Promise<Puppeteer.Response>>;
    let setBypassCSPMock: IMock<(enabled: boolean) => Promise<void>>;
    let pageContentMock: IMock<() => Promise<string>>;
    let puppeteerPageMock: PuppeteerPageMock;
    let axePuppeteerFactoryMock: IMock<AxePuppeteerFactory>;
    let webDriverMock: IMock<WebDriver>;
    let axePuppeteerMock: IMock<AxePuppeteer>;
    let puppeteerBrowserMock: PuppeteerBrowserMock;
    let page: Page;
    let gotoOptions: Puppeteer.DirectNavigationOptions;
    let waitOptions: Puppeteer.DirectNavigationOptions;

    beforeEach(() => {
        gotoOptions = {
            waitUntil: 'load' as Puppeteer.LoadEvent,
            timeout: 15000,
        };
        waitOptions = {
            waitUntil: 'networkidle0' as Puppeteer.LoadEvent,
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
        pageContentMock = Mock.ofInstance(() => {
            return undefined;
        });

        puppeteerPageMock = new PuppeteerPageMock(
            gotoMock.object,
            waitForNavigationMock.object,
            setBypassCSPMock.object,
            pageContentMock.object,
        );
        axePuppeteerFactoryMock = Mock.ofType<AxePuppeteerFactory>();
        axePuppeteerMock = Mock.ofType<AxePuppeteer>();
        webDriverMock = Mock.ofType<WebDriver>();
        puppeteerBrowserMock = new PuppeteerBrowserMock(puppeteerPageMock);
        webDriverMock
            .setup(async (o) => o.launch(It.isAny()))
            .returns(async () => Promise.resolve(<Puppeteer.Browser>(<unknown>puppeteerBrowserMock)))
            .verifiable(Times.once());
        page = new Page(axePuppeteerFactoryMock.object, webDriverMock.object);
    });

    it('should return error info when page is not html', async () => {
        const scanUrl = 'https://www.non-html-url.com';
        const contentType = 'text/plain';

        const errorResult: AxeScanResults = {
            error: {
                responseStatusCode: 500,
                errorType: 'HttpErrorCode',
                message: `Page returned an unsuccessful response code`,
                stack: `Page returned an unsuccessful response code 500`,
            },
        };
        const response: Puppeteer.Response = makeResponse({ contentType: contentType, statusCode: 500 });

        gotoMock
            .setup(async (goto) => goto(scanUrl, gotoOptions))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        waitForNavigationMock.setup(async (wait) => wait(waitOptions)).verifiable(Times.once());

        axePuppeteerMock.setup(async (o) => o.analyze()).verifiable(Times.never());
        axePuppeteerFactoryMock
            .setup(async (apfm) => apfm.createAxePuppeteer(page.puppeteerPage, It.isAny()))
            .returns(async () => Promise.resolve(axePuppeteerMock.object))
            .verifiable(Times.once());

        await page.create();
        const result = await page.scanForA11yIssues(scanUrl);

        expect(result).toEqual(errorResult);
    });

    it('should check page response before checking if page is not html', async () => {
        const scanUrl = 'https://www.non-html-url.com';
        const contentType = 'text/plain';

        const errorResult: AxeScanResults = {
            error: {
                responseStatusCode: 500,
                errorType: 'HttpErrorCode',
                message: 'Page returned an unsuccessful response code',
                stack: 'Page returned an unsuccessful response code 500',
            },
        };
        const response: Puppeteer.Response = makeResponse({ contentType: contentType, statusCode: 500 });

        gotoMock
            .setup(async (goto) => goto(scanUrl, gotoOptions))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        waitForNavigationMock.setup(async (wait) => wait(waitOptions)).verifiable(Times.once());

        axePuppeteerMock.setup(async (o) => o.analyze()).verifiable(Times.never());
        axePuppeteerFactoryMock
            .setup(async (apfm) => apfm.createAxePuppeteer(page.puppeteerPage, It.isAny()))
            .returns(async () => Promise.resolve(axePuppeteerMock.object))
            .verifiable(Times.once());

        await page.create();
        const result = await page.scanForA11yIssues(scanUrl);

        expect(result).toEqual(errorResult);
    });

    it('should analyze accessibility issues, even if error thrown when waitForNavigation', async () => {
        const scanUrl = 'https://www.example.com';
        const axeResults: AxeResults = createEmptyAxeResults(scanUrl);
        const scanResults: AxeScanResults = {
            results: axeResults,
            pageTitle: PuppeteerPageMock.pageTitle,
            browserSpec: PuppeteerBrowserMock.browserVersion,
        };
        const response: Puppeteer.Response = makeResponse({ statusCode: 200 });
        gotoMock
            .setup(async (goto) => goto(scanUrl, gotoOptions))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        waitForNavigationMock
            .setup(async (wait) => wait(waitOptions))
            .returns(async () => {
                throw new Error('network timed out');
            })
            .verifiable(Times.once());

        axePuppeteerFactoryMock
            .setup(async (o) => o.createAxePuppeteer(It.isAny(), It.isAny()))
            .returns(async () => Promise.resolve({ analyze: async () => Promise.resolve(axeResults) } as any))
            .verifiable(Times.once());

        await page.create();
        const result = await page.scanForA11yIssues(scanUrl);

        axePuppeteerFactoryMock.verifyAll();
        axePuppeteerMock.verifyAll();

        expect(result).toEqual(scanResults);
    });

    it('should wait for page rendering to fully complete', async () => {
        const scanUrl = 'https://www.example.com';
        const axeResults: AxeResults = createEmptyAxeResults(scanUrl);
        const scanResults: AxeScanResults = {
            results: axeResults,
            pageTitle: PuppeteerPageMock.pageTitle,
            browserSpec: PuppeteerBrowserMock.browserVersion,
        };
        const response: Puppeteer.Response = makeResponse({ statusCode: 200 });
        gotoMock
            .setup(async (goto) => goto(scanUrl, gotoOptions))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());
        waitForNavigationMock.setup(async (wait) => wait(waitOptions)).verifiable(Times.once());
        axePuppeteerFactoryMock
            .setup(async (o) => o.createAxePuppeteer(It.isAny(), It.isAny()))
            .returns(async () => Promise.resolve({ analyze: async () => Promise.resolve(axeResults) } as any))
            .verifiable(Times.once());

        const dynamicContentInvocationCount = 4;
        let content = 'page content ';
        let i = 0;
        pageContentMock
            .setup(async (o) => o())
            .callback(() => {
                if (i < dynamicContentInvocationCount) {
                    content += '+';
                    i += 1;
                }
            })
            .returns(async () => Promise.resolve(content))
            .verifiable(Times.exactly(dynamicContentInvocationCount + 3));

        await page.create();
        const result = await page.scanForA11yIssues(scanUrl);

        axePuppeteerFactoryMock.verifyAll();
        axePuppeteerMock.verifyAll();
        pageContentMock.verifyAll();

        expect(result).toEqual(scanResults);
    });

    it('should create new browser page', async () => {
        await page.create();
        expect(page.puppeteerPage).toEqual(puppeteerBrowserMock.puppeteerPage);
        webDriverMock.verifyAll();
    });

    it('should call setBypassCSP', async () => {
        setBypassCSPMock.setup(async (setBypassCSP) => setBypassCSP(true)).verifiable(Times.once());

        await page.create();
        await page.enableBypassCSP();
        expect(page.puppeteerPage).toEqual(puppeteerBrowserMock.puppeteerPage);
        setBypassCSPMock.verifyAll();
    });

    it('should return error info for non-successful status code', async () => {
        const scanUrl = 'https://www.error-url.com';
        const errorResult: AxeScanResults = {
            error: {
                responseStatusCode: 404,
                errorType: 'HttpErrorCode',
                message: 'Page returned an unsuccessful response code',
                stack: 'Page returned an unsuccessful response code 404',
            },
        };
        const response: Puppeteer.Response = makeResponse({ statusCode: 404 });

        gotoMock
            .setup(async (goto) => goto(scanUrl, gotoOptions))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        waitForNavigationMock.setup(async (wait) => wait(waitOptions)).verifiable(Times.once());

        axePuppeteerMock.setup(async (o) => o.analyze()).verifiable(Times.never());
        axePuppeteerFactoryMock
            .setup(async (apfm) => apfm.createAxePuppeteer(page.puppeteerPage, It.isAny()))
            .returns(async () => Promise.resolve(axePuppeteerMock.object))
            .verifiable(Times.once());

        await page.create();
        const result = await page.scanForA11yIssues(scanUrl);

        expect(result).toEqual(errorResult);
    });

    it.skip('validates scanning in dev box', async () => {
        const webDriver = new WebDriver();
        page = new Page(new AxePuppeteerFactory(), webDriver);

        await page.create();

        await page.enableBypassCSP();

        const results = await page.scanForA11yIssues('https://www.bing.com');

        let violationCount = 0;
        results.results.violations.map((v) => {
            violationCount += v.nodes.length;
        });

        console.log('violations count >>>', violationCount);
        console.log(results);
    }, 50000);

    it('should add the redirected url to results', async () => {
        const redirectFromUrl = 'https://www.redirect-from.com';
        const redirectToUrl = 'https://www.redirect-to.com';
        const axeResults = createEmptyAxeResults(redirectToUrl);
        const scanResults: AxeScanResults = {
            results: axeResults,
            scannedUrl: redirectToUrl,
            pageTitle: PuppeteerPageMock.pageTitle,
            browserSpec: PuppeteerBrowserMock.browserVersion,
        };
        const response: Puppeteer.Response = makeResponse({ withRedirect: true, statusCode: 200 });
        gotoMock
            .setup(async (goto) => goto(redirectFromUrl, gotoOptions))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        waitForNavigationMock.setup(async (wait) => wait(waitOptions)).verifiable(Times.once());

        axePuppeteerFactoryMock
            .setup(async (o) => o.createAxePuppeteer(It.isAny(), It.isAny()))
            .returns(async () => Promise.resolve({ analyze: async () => Promise.resolve(axeResults) } as any))
            .verifiable(Times.once());

        await page.create();
        const result = await page.scanForA11yIssues(redirectFromUrl);

        axePuppeteerFactoryMock.verifyAll();
        axePuppeteerMock.verifyAll();

        expect(result).toEqual(scanResults);
    });

    describe('handles navigation errors', () => {
        interface NavigationErrorTestCase {
            errorMessage: string;
            expectedScanErrorType: ScanErrorTypes;
        }

        const testCaseMappings: NavigationErrorTestCase[] = [
            {
                errorMessage: 'TimeoutError: Navigation Timeout Exceeded: 30000ms exceeded\n    at Promise.then (',
                expectedScanErrorType: 'UrlNavigationTimeout',
            },
            {
                errorMessage: 'Puppeteer navigation failed: net::ERR_CERT_AUTHORITY_INVALID',
                expectedScanErrorType: 'SslError',
            },
            {
                errorMessage: 'Puppeteer navigation failed: net::ERR_CONNECTION_REFUSED',
                expectedScanErrorType: 'ResourceLoadFailure',
            },
            {
                errorMessage: 'Puppeteer navigation  failed: Cannot navigate to invalid URL',
                expectedScanErrorType: 'InvalidUrl',
            },
            {
                errorMessage: 'Puppeteer navigation  failed: Cannot navigate to Invalid url',
                expectedScanErrorType: 'InvalidUrl',
            },
            {
                errorMessage: 'Puppeteer navigation  failed: net::ERR_ABORTED',
                expectedScanErrorType: 'EmptyPage',
            },
            {
                errorMessage: 'Puppeteer navigation  failed: net::ERR_NAME_NOT_RESOLVED',
                expectedScanErrorType: 'UrlNotResolved',
            },
        ];

        test.each(testCaseMappings)('should identify errors thrown by goto - %o', async (testCase: NavigationErrorTestCase) => {
            const testCaseError = new Error(testCase.errorMessage);
            const scanUrl = 'https://www.problem-url.com';

            const errorResult: AxeScanResults = {
                error: {
                    errorType: testCase.expectedScanErrorType,
                    message: testCase.errorMessage,
                    stack: testCaseError.stack,
                },
            };

            gotoMock
                .setup(async (goto) => goto(scanUrl, gotoOptions))
                .returns(async () => {
                    throw testCaseError;
                })
                .verifiable(Times.once());

            waitForNavigationMock.setup(async (wait) => wait(waitOptions)).verifiable(Times.once());
            axePuppeteerMock.setup(async (o) => o.analyze()).verifiable(Times.never());
            axePuppeteerFactoryMock
                .setup(async (apfm) => apfm.createAxePuppeteer(page.puppeteerPage, It.isAny()))
                .returns(async () => Promise.resolve(axePuppeteerMock.object))
                .verifiable(Times.once());

            await page.create();
            const result = await page.scanForA11yIssues(scanUrl);

            expect(result).toEqual(errorResult);
        });
    });
});

interface ResponseOptions {
    contentType?: string;
    statusCode?: number;
    withRedirect?: boolean;
}

function makeResponse(options: ResponseOptions): Puppeteer.Response {
    const statusCode: number = options.statusCode === undefined ? 200 : options.statusCode;
    const contentType: string = options.contentType === undefined ? 'text/html' : options.contentType;

    const redirectChain: string[] = [];

    if (options.withRedirect) {
        redirectChain.push('redirect');
    }
    const request = {
        redirectChain: () => {
            return redirectChain;
        },
        url: () => {
            return '';
        },
    };

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
        request: () => {
            return request;
        },
    } as any;
}

function createEmptyAxeResults(url: string): AxeResults {
    return { url: url } as AxeResults;
}
