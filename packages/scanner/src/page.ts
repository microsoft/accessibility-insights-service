// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxePuppeteer } from 'axe-puppeteer';
import { System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import * as Puppeteer from 'puppeteer';
import { AxeScanResults, ScanError } from './axe-scan-results';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { WebDriver } from './web-driver';

@injectable()
export class Page {
    public puppeteerPage: Puppeteer.Page;
    public browser: Puppeteer.Browser;

    private readonly pageNavigationTimeoutMsecs = 15000;
    private readonly pageRenderingTimeoutMsecs = 5000;

    constructor(
        @inject(WebDriver) private readonly webDriver: WebDriver,
        @inject(AxePuppeteerFactory) private readonly axePuppeteerFactory: AxePuppeteerFactory,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async create(): Promise<void> {
        this.browser = await this.webDriver.launch();
        this.puppeteerPage = await this.browser.newPage();
        await this.puppeteerPage.setUserAgent(this.webDriver.userAgent);
    }

    public async enableBypassCSP(): Promise<void> {
        return this.puppeteerPage.setBypassCSP(true);
    }

    public async scanForA11yIssues(url: string): Promise<AxeScanResults> {
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
            this.logger.logWarn(`Page still has network activity after the timeout ${this.pageNavigationTimeoutMsecs} milliseconds`);
        }

        let startPageRenderingTimestamp: [number, number];
        let response: Puppeteer.Response;
        try {
            response = await gotoUrlPromise;
            startPageRenderingTimestamp = process.hrtime();
        } catch (err) {
            this.logger.logError('The URL navigation failed', { scanError: System.serializeError(err) });

            return { error: this.getScanErrorFromNavigationFailure((err as Error).message), pageResponseCode: undefined };
        }

        if (!response.ok()) {
            this.logger.logError('The URL navigation returned an unsuccessful response code', {
                statusCode: response.status().toString(),
            });

            return {
                error: {
                    errorType: 'HttpErrorCode',
                    message: 'Page returned an unsuccessful response code',
                },
                pageResponseCode: response.status(),
            };
        }

        if (!this.isHtmlPage(response)) {
            const contentType = this.getContentType(response.headers());

            this.logger.logError('The URL returned non-HTML content', { contentType: contentType });

            return {
                unscannable: true,
                error: {
                    errorType: 'InvalidContentType',
                    message: `Content type: ${contentType}`,
                },
                pageResponseCode: response.status(),
            };
        }

        await this.waitForPageToCompleteRendering(this.puppeteerPage, startPageRenderingTimestamp, this.pageRenderingTimeoutMsecs);

        return this.scanPageForIssues(response);
    }

    public async close(): Promise<void> {
        if (this.webDriver !== undefined) {
            await this.webDriver.close();
        }
    }

    private async scanPageForIssues(response: Puppeteer.Response): Promise<AxeScanResults> {
        const axePuppeteer: AxePuppeteer = await this.axePuppeteerFactory.createAxePuppeteer(this.puppeteerPage);
        const axeResults = await axePuppeteer.analyze();

        const scanResults: AxeScanResults = {
            results: axeResults,
            pageTitle: await this.puppeteerPage.title(),
            browserSpec: await this.browser.version(),
            pageResponseCode: response.status(),
        };

        if (response.request().redirectChain().length > 0) {
            this.logger.logWarn(`Scanning performed on redirected page ${axeResults.url}`);
            scanResults.scannedUrl = axeResults.url;
        }

        return scanResults;
    }

    private async waitForPageToCompleteRendering(
        page: Puppeteer.Page,
        pageLoadedTimestamp: [number, number],
        timeout: number,
    ): Promise<void> {
        const checkIntervalMsecs = 200;
        const maxCheckCount = timeout / checkIntervalMsecs;
        const minCheckBreakCount = 3;

        let lastCheckPageHtmlContentSize = 0;
        let checkCount = 1;
        let continuousStableCheckCount = 0;
        let pageHasStableContent = false;

        while (checkCount <= maxCheckCount) {
            const pageHtmlContent = await page.content();
            const pageHtmlContentSize = pageHtmlContent?.length;

            if (lastCheckPageHtmlContentSize !== 0 && pageHtmlContentSize === lastCheckPageHtmlContentSize) {
                continuousStableCheckCount += 1;
            } else {
                continuousStableCheckCount = 0;
            }

            if (continuousStableCheckCount >= minCheckBreakCount) {
                pageHasStableContent = true;
                break;
            }

            lastCheckPageHtmlContentSize = pageHtmlContentSize;
            checkCount += 1;

            await page.waitFor(checkIntervalMsecs);
        }

        const elapsed = this.getElapsedTime(pageLoadedTimestamp, process.hrtime());
        if (pageHasStableContent === true) {
            this.logger.logInfo(`Page completed full rendering within ${elapsed} seconds.`);
        } else {
            this.logger.logWarn(`Page did not complete full rendering after the ${elapsed} seconds timeout.`);
        }
    }

    private getElapsedTime(start: [number, number], end: [number, number]): number {
        const fraction = 1e9 - start[1] + end[1];
        const secs = end[0] - start[0] + Math.trunc(fraction / 1e9);
        const msecs = Math.round(((fraction / 1e9) % 1) * 1000);

        return secs + msecs / 1000;
    }

    private getScanErrorFromNavigationFailure(errorMessage: string): ScanError {
        const scanError: ScanError = {
            errorType: 'NavigationError',
            message: errorMessage,
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
