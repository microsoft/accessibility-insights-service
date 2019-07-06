// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxeResults } from 'axe-core';
import { AxePuppeteer } from 'axe-puppeteer';
import { inject, injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';

export type AxePuppeteerFactory = (page: Puppeteer.Page) => AxePuppeteer;
export type PuppeteerBrowserFactory = () => Puppeteer.Browser;

const axePuppeteerFactoryImpl = (page: Puppeteer.Page) => new AxePuppeteer(page);

@injectable()
export class Page {
    public puppeteerPage: Puppeteer.Page;

    constructor(
        @inject('Factory<Browser>') private readonly browserFactory: PuppeteerBrowserFactory,
        private readonly axePuppeteerFactory: AxePuppeteerFactory = axePuppeteerFactoryImpl,
    ) {}

    public async create(): Promise<void> {
        this.puppeteerPage = await this.browserFactory().newPage();
    }

    public async enableBypassCSP(): Promise<void> {
        return this.puppeteerPage.setBypassCSP(true);
    }

    public async goto(url: string): Promise<void> {
        const gotoUrlPromise = this.puppeteerPage
            .goto(url, { waitUntil: ['load'] })
            .then(response => {
                const contentType = response.headers()['content-type'];
                if (contentType.indexOf('text/html') !== -1) {
                    throw Error(`Scan cannot run on ${url} of document type: ${contentType}`);
                }
            });

        const waitForNetworkLoadPromise = this.puppeteerPage.waitForNavigation({ waitUntil: ['networkidle0'], timeout: 15000 });

        await gotoUrlPromise;

        try {
            // We ignore error if the page still has network activity after 15 sec
            await waitForNetworkLoadPromise;
            // tslint:disable-next-line:no-empty
        } catch {}
    }

    public async scanForA11yIssues(): Promise<AxeResults> {
        const axePuppeteer: AxePuppeteer = this.axePuppeteerFactory(this.puppeteerPage);

        return axePuppeteer.analyze();
    }

    public async close(): Promise<void> {
        if (this.puppeteerPage !== undefined) {
            await this.puppeteerPage.close();
        }
    }
}
