// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxePuppeteer } from 'axe-puppeteer';
import { inject, injectable } from 'inversify';
import { Logger, LogLevel } from 'logger';
import * as Puppeteer from 'puppeteer';
import { AxeScanResults, ScanError, ScanErrorTypes } from './axe-scan-results';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';

export type PuppeteerBrowserFactory = () => Puppeteer.Browser;

@injectable()
export class Page {
    public puppeteerPage: Puppeteer.Page;

    constructor(
        @inject('Factory<Browser>') private readonly browserFactory: PuppeteerBrowserFactory,
        @inject(AxePuppeteerFactory) private readonly axePuppeteerFactory: AxePuppeteerFactory,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async create(): Promise<void> {
        this.puppeteerPage = await this.browserFactory().newPage();
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

        const gotoUrlPromise = this.puppeteerPage.goto(url, { waitUntil: ['load'], timeout: 60000 });
        const networkLoadTimeoutInMilleSec = 15000;
        const waitForNetworkLoadPromise = this.puppeteerPage.waitForNavigation({
            waitUntil: ['networkidle0'],
            timeout: networkLoadTimeoutInMilleSec,
        });

        let response;

        try {
            response = await gotoUrlPromise;
        } catch (err) {
            this.log(LogLevel.error, url, 'The URL navigation failed', { scanError: JSON.stringify(err) });

            return { error: this.getScanErrorFromNavigationFailure((err as Error).message) };
        }

        if (!this.isHtmlPage(response)) {
            const contentType = this.getContentType(response.headers());

            this.log(LogLevel.error, url, 'The URL returned non-HTML content', { contentType: contentType });

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
            this.log(LogLevel.error, url, 'url navigation returned failed response', { statusCode: response.status().toString() });

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
            this.log(LogLevel.warn, url, `Page still has network activity after the timeout ${networkLoadTimeoutInMilleSec} milliseconds`);
        }

        const axePuppeteer: AxePuppeteer = await this.axePuppeteerFactory.createAxePuppeteer(this.puppeteerPage);
        const scanResults = await axePuppeteer.analyze();

        if (response.request().redirectChain().length > 0) {
            this.log(LogLevel.info, url, `Scanning performed on redirected page - ${scanResults.url}`);

            return {
                results: scanResults,
                scannedUrl: scanResults.url,
            };
        } else {
            return { results: scanResults };
        }
    }

    public async close(): Promise<void> {
        if (this.puppeteerPage !== undefined) {
            await this.puppeteerPage.close();
        }
    }

    private log(
        logLevel: LogLevel,
        url: string,
        message: string,
        properties?: {
            [name: string]: string;
        },
    ): void {
        this.logger.log(message, logLevel, {
            ...this.getBaseTelemetryProps(url),
            ...properties,
        });
    }

    private getBaseTelemetryProps(
        url: string,
    ): {
        [name: string]: string;
    } {
        return {
            scanUrl: url,
        };
    }

    private getScanErrorFromNavigationFailure(errorMessage: string): ScanError {
        const scanError: ScanError = {
            errorType: 'NavigationError',
            message: errorMessage,
        };

        if (/TimeoutError: Navigation Timeout Exceeded:/i.test(errorMessage)) {
            scanError.errorType = 'UrlNavigationTimeout';
        }
        if (errorMessage.includes('net::ERR_CERT_AUTHORITY_INVALID') || errorMessage.includes('SSL_ERROR_UNKNOWN')) {
            scanError.errorType = 'SslError';
        }
        if (errorMessage.includes('net::ERR_CONNECTION_REFUSED') || errorMessage.includes('NS_ERROR_CONNECTION_REFUSED')) {
            scanError.errorType = 'ResourceLoadFailure';
        }
        if (errorMessage.includes('Cannot navigate to invalid URL') || errorMessage.includes('Invalid url')) {
            scanError.errorType = 'InvalidUrl';
        }
        if (errorMessage.includes('net::ERR_ABORTED') || errorMessage.includes('NS_BINDING_ABORTED')) {
            scanError.errorType = 'EmptyPage';
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
