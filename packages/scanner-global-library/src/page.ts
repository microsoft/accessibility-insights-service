// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { System } from 'common';
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import * as Puppeteer from 'puppeteer';
import { AxeScanResults } from './axe-scan-results';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { PageConfigurator } from './page-configurator';
import { PageHandler } from './page-handler';
import { PageResponseProcessor } from './page-response-processor';
import { WebDriver } from './web-driver';

@injectable()
export class Page {
    public puppeteerPage: Puppeteer.Page;
    public browser: Puppeteer.Browser;
    public userAgent: string;

    private readonly pageNavigationTimeoutMsecs = 15000;
    private readonly pageRenderingTimeoutMsecs = 5000;

    constructor(
        @inject(WebDriver) private readonly webDriver: WebDriver,
        @inject(AxePuppeteerFactory) private readonly axePuppeteerFactory: AxePuppeteerFactory,
        @inject(PageConfigurator) private readonly pageConfigurator: PageConfigurator,
        @inject(PageResponseProcessor) private readonly pageResponseProcessor: PageResponseProcessor,
        @inject(PageHandler) private readonly pageHandler: PageHandler,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public async create(browserExecutablePath?: string): Promise<void> {
        this.browser = await this.webDriver.launch(browserExecutablePath);
        this.puppeteerPage = await this.browser.newPage();
        await this.pageConfigurator.configurePage(this.puppeteerPage);
        this.userAgent = this.pageConfigurator.getUserAgent();
    }

    public async scanForA11yIssues(url: string, contentSourcePath?: string): Promise<AxeScanResults> {
        // separate page load and networkidle0 events to bypass network activity error
        const gotoUrlPromise = this.puppeteerPage.goto(url, { waitUntil: 'load', timeout: this.pageNavigationTimeoutMsecs });
        try {
            await this.puppeteerPage.waitForNavigation({
                waitUntil: 'networkidle0',
                timeout: this.pageNavigationTimeoutMsecs,
            });
        } catch {
            // We ignore error if the page still has network activity after timeout
            this.logger?.logWarn(`Page still has network activity after the timeout ${this.pageNavigationTimeoutMsecs} milliseconds`);
        }

        let response: Puppeteer.Response;
        try {
            response = await gotoUrlPromise;
        } catch (err) {
            this.logger?.logError('The URL navigation failed', { browserError: System.serializeError(err) });
            const browserError = this.pageResponseProcessor.getNavigationError(err as Error);

            return { error: browserError };
        }

        // Validate web service response
        const responseError = this.pageResponseProcessor.getResponseError(response);
        if (responseError !== undefined) {
            this.logger?.logError('The URL navigation was unsuccessful', {
                browserError: JSON.stringify(responseError),
            });

            return { error: responseError, pageResponseCode: responseError.statusCode };
        }

        await this.pageHandler.waitForPageToCompleteRendering(this.puppeteerPage, this.pageRenderingTimeoutMsecs);

        return this.scanPageForIssues(response, contentSourcePath);
    }

    public async close(): Promise<void> {
        if (this.webDriver !== undefined) {
            await this.webDriver.close();
        }
    }

    private async scanPageForIssues(response: Puppeteer.Response, contentSourcePath?: string): Promise<AxeScanResults> {
        const axePuppeteer = await this.axePuppeteerFactory.createAxePuppeteer(this.puppeteerPage, contentSourcePath);
        const axeResults = await axePuppeteer.analyze();

        const scanResults: AxeScanResults = {
            results: axeResults,
            pageTitle: await this.puppeteerPage.title(),
            browserSpec: await this.browser.version(),
            pageResponseCode: response.status(),
        };

        if (response.request().redirectChain().length > 0) {
            this.logger?.logWarn(`Scanning performed on redirected page`, { redirectedUrl: axeResults.url });
            scanResults.scannedUrl = axeResults.url;
        }

        return scanResults;
    }
}
