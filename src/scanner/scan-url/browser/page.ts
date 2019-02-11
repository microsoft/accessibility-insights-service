import { AxeResults } from 'axe-core';
import { AxePuppeteer } from 'axe-puppeteer';
import * as Puppeteer from 'puppeteer';

import { AxePuppeteerFactory } from '../axe-puppeteer-factory';

export class Page {
    constructor(private readonly underlyingPage: Puppeteer.Page, private readonly axePuppeteerFactory: AxePuppeteerFactory) {}

    public async enableBypassCSP(): Promise<void> {
        return this.underlyingPage.setBypassCSP(true);
    }

    public async goto(url: string): Promise<void> {
        const gotoUrlPromise = this.underlyingPage.goto(url, { waitUntil: ['load'] });
        const waitForNetworkLoadPromise = this.underlyingPage.waitForNavigation({ waitUntil: ['networkidle0'], timeout: 15000 });

        await gotoUrlPromise;
        try {
            // We ignore error if the page still has network activity after 15 sec
            await waitForNetworkLoadPromise;
            // tslint:disable-next-line:no-empty
        } catch {}
    }

    public async scanForA11yIssues(): Promise<AxeResults> {
        const axePuppeteer: AxePuppeteer = this.axePuppeteerFactory.createInstance(this.underlyingPage);

        return axePuppeteer.analyze();
    }
}
