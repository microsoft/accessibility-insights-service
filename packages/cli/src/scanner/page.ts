// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxePuppeteer } from 'axe-puppeteer';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import * as Puppeteer from 'puppeteer';
import { AxePuppeteerFactory } from '../factories/axe-puppeteer-factory';
import { WebDriver } from '../web-driver/web-driver';
import { AxeScanResults, ScanError } from './axe-scan-results';

export type PuppeteerBrowserFactory = () => Puppeteer.Browser;

@injectable()
export class Page {
    public puppeteerPage: Puppeteer.Page;
    public browser: Puppeteer.Browser;

    constructor(
        @inject(AxePuppeteerFactory) private readonly axePuppeteerFactory: AxePuppeteerFactory,
        @inject(WebDriver) private readonly webDriver: WebDriver,
    ) {}

    public async create(): Promise<void> {
        if (isEmpty(this.browser)) {
            this.browser = await this.webDriver.launch();
        }
        this.puppeteerPage = await this.browser.newPage();
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

        const gotoUrlPromise = this.puppeteerPage.goto(url, { waitUntil: ['load'], timeout: 120000 });
        const networkLoadTimeoutInMilleSec = 30000;
        const waitForNetworkLoadPromise = this.puppeteerPage.waitForNavigation({
            waitUntil: ['networkidle0'],
            timeout: networkLoadTimeoutInMilleSec,
        });

        let response;

        try {
            response = await gotoUrlPromise;
        } catch (err) {
            console.log('The URL navigation failed', { scanError: JSON.stringify(err) });

            return { error: this.getScanErrorFromNavigationFailure((err as Error).message) };
        }

        if (!this.isHtmlPage(response)) {
            const contentType = this.getContentType(response.headers());

            console.log('The URL returned non-HTML content', { contentType: contentType });

            return {
                unscannable: true,
                error: {
                    errorType: 'InvalidContentType',
                    responseStatusCode: response.status(),
                    message: `Content type - ${contentType}`,
                },
            };
        }

        if (!response.ok()) {
            console.log('url navigation returned failed response', { statusCode: response.status().toString() });

            return {
                error: {
                    errorType: 'HttpErrorCode',
                    responseStatusCode: response.status(),
                    message: 'Page returned an unsuccessful response code',
                },
            };
        }

        try {
            // We ignore error if the page still has network activity after 15 sec
            await waitForNetworkLoadPromise;
            // tslint:disable-next-line:no-empty
        } catch {
            console.log(`Page still has network activity after the timeout ${networkLoadTimeoutInMilleSec} milliseconds`);
        }

        const axePuppeteer: AxePuppeteer = await this.axePuppeteerFactory.createAxePuppeteer(this.puppeteerPage);
        const axeResults = await axePuppeteer.analyze();

        const scanResults: AxeScanResults = {
            results: axeResults,
            pageTitle: await this.puppeteerPage.title(),
            browserSpec: await this.browser.version(),
        };

        if (response.request().redirectChain().length > 0) {
            scanResults.scannedUrl = axeResults.url;
        }

        return scanResults;
    }

    public async close(): Promise<void> {
        if (this.puppeteerPage !== undefined) {
            await this.puppeteerPage.close();
            await this.webDriver.close();
        }
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
        // All header names are lower-case, According to puppeteer API doc
        return headers['content-type'];
    }
}
