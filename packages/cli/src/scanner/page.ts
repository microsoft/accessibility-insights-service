// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxePuppeteer } from 'axe-puppeteer';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import * as Puppeteer from 'puppeteer';
import { serializeError } from 'serialize-error';
import { AxePuppeteerFactory } from '../factories/axe-puppeteer-factory';
import { WebDriver } from '../web-driver/web-driver';
import { AxeScanResults, ScanError } from './axe-scan-results';

export type PuppeteerBrowserFactory = () => Puppeteer.Browser;

@injectable()
export class Page {
    public puppeteerPage: Puppeteer.Page;
    public browser: Puppeteer.Browser;

    private readonly pageNavigationTimeoutMsecs = 15000;
    private readonly pageRenderingTimeoutMsecs = 5000;

    constructor(
        @inject(AxePuppeteerFactory) private readonly axePuppeteerFactory: AxePuppeteerFactory,
        @inject(WebDriver) private readonly webDriver: WebDriver,
    ) {}

    public async create(chromePath?: string): Promise<void> {
        if (isEmpty(this.browser) || !this.browser.isConnected()) {
            this.browser = await this.webDriver.launch(chromePath);
        }
        this.puppeteerPage = await this.browser.newPage();
        await this.puppeteerPage.setUserAgent(this.webDriver.userAgent);
    }

    public async enableBypassCSP(): Promise<void> {
        return this.puppeteerPage.setBypassCSP(true);
    }

    public async scanForA11yIssues(url: string, sourcePath?: string): Promise<AxeScanResults> {
        await this.puppeteerPage.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
        });

        // separate page load and networkidle0 events to bypass network activity error
        const gotoUrlPromise = this.puppeteerPage.goto(url, { waitUntil: 'load', timeout: this.pageNavigationTimeoutMsecs });
        try {
            await this.puppeteerPage.waitForNavigation({
                waitUntil: 'networkidle0',
                timeout: this.pageNavigationTimeoutMsecs,
            }); // tslint:disable-next-line:no-empty
        } catch {
            // We ignore error if the page still has network activity after timeout
            console.log(`Page still has network activity after the timeout ${this.pageNavigationTimeoutMsecs} milliseconds.`, url);
        }

        let response: Puppeteer.Response;
        try {
            response = await gotoUrlPromise;
        } catch (error) {
            console.log('The URL navigation failed.', url, { scanError: serializeError(error) });

            return { error: this.getScanErrorFromNavigationFailure(error as Error) };
        }

        if (!response.ok()) {
            console.log('The URL navigation returned an unsuccessful response code.', { statusCode: response.status().toString() });

            return {
                error: {
                    errorType: 'HttpErrorCode',
                    responseStatusCode: response.status(),
                    message: 'Page returned an unsuccessful response code',
                },
            };
        }

        if (!this.isHtmlPage(response)) {
            const contentType = this.getContentType(response.headers());

            console.log('The URL returned non-HTML content.', { contentType: contentType });

            return {
                unscannable: true,
                error: {
                    errorType: 'InvalidContentType',
                    responseStatusCode: response.status(),
                    message: `Content type: ${contentType}`,
                },
            };
        }

        await this.waitForPageToCompleteRendering(this.puppeteerPage, this.pageRenderingTimeoutMsecs);

        return this.scanPageForIssues(response, sourcePath);
    }

    public async close(): Promise<void> {
        if (this.webDriver !== undefined) {
            await this.webDriver.close();
        }
    }

    private async scanPageForIssues(response: Puppeteer.Response, sourcePath?: string): Promise<AxeScanResults> {
        const axePuppeteer: AxePuppeteer = await this.axePuppeteerFactory.createAxePuppeteer(this.puppeteerPage, sourcePath);
        const axeResults = await axePuppeteer.analyze();

        const scanResults: AxeScanResults = {
            results: axeResults,
            pageTitle: await this.puppeteerPage.title(),
            browserSpec: await this.browser.version(),
        };

        if (response.request().redirectChain().length > 0 && response.request().url() !== axeResults.url) {
            console.log(`Scan performed on redirected page ${axeResults.url}`);
            scanResults.scannedUrl = axeResults.url;
        }

        return scanResults;
    }

    private async waitForPageToCompleteRendering(page: Puppeteer.Page, timeoutMsecs: number): Promise<void> {
        const checkIntervalMsecs = 200;
        const maxCheckCount = timeoutMsecs / checkIntervalMsecs;
        const minCheckBreakCount = 3;

        let checkCount = 0;
        let continuousStableCheckCount = 0;
        let lastCheckPageHtmlContentSize = 0;
        let pageHasStableContent = false;

        while (checkCount < maxCheckCount) {
            const pageHtmlContentSize = await page.evaluate(() => document.body.innerHTML.length);

            if (lastCheckPageHtmlContentSize !== 0 && pageHtmlContentSize === lastCheckPageHtmlContentSize) {
                continuousStableCheckCount += 1;
            } else {
                continuousStableCheckCount = 0;
            }
            lastCheckPageHtmlContentSize = pageHtmlContentSize;

            if (continuousStableCheckCount >= minCheckBreakCount) {
                pageHasStableContent = true;
                break;
            }

            await page.waitFor(checkIntervalMsecs);
            checkCount += 1;
        }

        if (pageHasStableContent !== true) {
            console.log(`Page did not complete full rendering after ${timeoutMsecs / 1000} seconds.`);
        }
    }

    private getScanErrorFromNavigationFailure(error: Error): ScanError {
        const scanError: ScanError = {
            errorType: 'NavigationError',
            message: error.message,
            stack: error.stack,
        };

        if (/TimeoutError: Navigation Timeout Exceeded:/i.test(errorMessage)) {
            scanError.errorType = 'UrlNavigationTimeout';
        } else if (errorMessage.includes('net::ERR_CERT_AUTHORITY_INVALID') || errorMessage.includes('SSL_ERROR_UNKNOWN')) {
            scanError.errorType = 'SslError';
        } else if (errorMessage.includes('net::ERR_CONNECTION_REFUSED') || errorMessage.includes('NS_ERROR_CONNECTION_REFUSED')) {
            scanError.errorType = 'ResourceLoadFailure';
        } else if (errorMessage.includes('Cannot navigate to invalid URL') || errorMessage.includes('Invalid url')) {
            scanError.errorType = 'InvalidUrl';
        } else if (errorMessage.includes('net::ERR_ABORTED') || errorMessage.includes('NS_BINDING_ABORTED')) {
            scanError.errorType = 'EmptyPage';
        } else if (errorMessage.includes('net::ERR_NAME_NOT_RESOLVED')) {
            scanError.errorType = 'UrlNotResolved';
        }

        return scanError;
    }

    private isHtmlPage(response: Puppeteer.Response): boolean {
        const contentType = this.getContentType(response.headers());

        return contentType !== undefined && contentType.indexOf('text/html') !== -1;
    }

    private getContentType(headers: Record<string, string>): string {
        // All header names are lower-case, according to puppeteer API doc
        return headers['content-type'];
    }
}
