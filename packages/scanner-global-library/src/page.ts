// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { System } from 'common';
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import * as Puppeteer from 'puppeteer';
import { AxeScanResults } from './axe-scan-results';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { WebDriver } from './web-driver';
import { PageNavigator } from './page-navigator';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class Page {
    public page: Puppeteer.Page;
    public browser: Puppeteer.Browser;
    public get userAgent(): string {
        return this.pageNavigator.pageConfigurator.getUserAgent();
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    private readonly puppeteerHar = require('puppeteer-har');
    private har: any;

    constructor(
        @inject(WebDriver) private readonly webDriver: WebDriver,
        @inject(AxePuppeteerFactory) private readonly axePuppeteerFactory: AxePuppeteerFactory,
        @inject(PageNavigator) private readonly pageNavigator: PageNavigator,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public async create(browserExecutablePath?: string): Promise<void> {
        this.browser = await this.webDriver.launch(browserExecutablePath);
        this.page = await this.browser.newPage();

        this.har = new this.puppeteerHar(this.page);
        await this.har.start({ path: `${__dirname}/trace-har.json` });
    }

    public async scanForA11yIssues(url: string, contentSourcePath?: string): Promise<AxeScanResults> {
        let scanResults: AxeScanResults;
        const response = await this.pageNavigator.navigate(url, this.page, async (browserError) => {
            this.logger?.logError('Page navigation error', { browserError: System.serializeError(browserError) });

            scanResults = { error: browserError, pageResponseCode: browserError.statusCode };
        });

        if (scanResults?.error !== undefined) {
            return scanResults;
        }

        return this.scanPageForIssues(response, contentSourcePath);
    }

    public async close(): Promise<void> {
        if (this.har !== undefined) {
            await this.har.stop();
        }

        if (this.webDriver !== undefined) {
            await this.webDriver.close();
        }
    }

    private async scanPageForIssues(response: Puppeteer.Response, contentSourcePath?: string): Promise<AxeScanResults> {
        const axePuppeteer = await this.axePuppeteerFactory.createAxePuppeteer(this.page, contentSourcePath);
        const axeResults = await axePuppeteer.analyze();

        const scanResults: AxeScanResults = {
            results: axeResults,
            pageTitle: await this.page.title(),
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
