import { AxeResults } from 'axe-core';
import { AxePuppeteer } from 'axe-puppeteer';
import * as Puppeteer from 'puppeteer';
import { AxePuppeteerFactory } from './axe-puppeteer-factory';

export class Page {
    private page: Puppeteer.Page;

    constructor(private readonly browser: Puppeteer.Browser, private readonly axePuppeteerFactory: AxePuppeteerFactory) {}

    public async create(): Promise<void> {
        this.page = await this.browser.newPage();
    }

    public async enableBypassCSP(): Promise<void> {
        return this.page.setBypassCSP(true);
    }

    public async goto(url: string): Promise<void> {
        const gotoUrlPromise = this.page.goto(url, { waitUntil: ['load'] });
        const waitForNetworkLoadPromise = this.page.waitForNavigation({ waitUntil: ['networkidle0'], timeout: 15000 });

        await gotoUrlPromise;
        try {
            // We ignore error if the page still has network activity after 15 sec
            await waitForNetworkLoadPromise;
            // tslint:disable-next-line:no-empty
        } catch {}
    }

    public async scanForA11yIssues(): Promise<AxeResults> {
        const axePuppeteer: AxePuppeteer = this.axePuppeteerFactory.createInstance(this.page);

        return axePuppeteer.analyze();
    }

    public async close(): Promise<void> {
        await this.page.close();
    }
}
