// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxePuppeteer } from 'axe-puppeteer';
import { inject, injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { AxeScanResults } from './axe-scan-results';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';

export type PuppeteerBrowserFactory = () => Puppeteer.Browser;

@injectable()
export class Page {
    public puppeteerPage: Puppeteer.Page;

    constructor(
        @inject('Factory<Browser>') private readonly browserFactory: PuppeteerBrowserFactory,
        @inject(AxePuppeteerFactory) private readonly axePuppeteerFactory: AxePuppeteerFactory,
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

        const gotoUrlPromise = this.puppeteerPage.goto(url, { waitUntil: ['load'] });
        const waitForNetworkLoadPromise = this.puppeteerPage.waitForNavigation({ waitUntil: ['networkidle0'], timeout: 15000 });

        const response = await gotoUrlPromise;

        if (!this.isHtmlPage(response)) {
            return { unscannable: true, error: `Cannot scan ${url} because it is not a html page.` };
        }

        if (!response.ok()) {
            return { error: `Error accessing ${url}: ${response.status()} ${response.statusText()}` };
        }

        try {
            // We ignore error if the page still has network activity after 15 sec
            await waitForNetworkLoadPromise;
            // tslint:disable-next-line:no-empty
        } catch {}

        const axePuppeteer: AxePuppeteer = await this.axePuppeteerFactory.createAxePuppeteer(this.puppeteerPage);
        const scanResults = await axePuppeteer.analyze();

        return { results: scanResults };
    }

    public async close(): Promise<void> {
        if (this.puppeteerPage !== undefined) {
            await this.puppeteerPage.close();
        }
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
