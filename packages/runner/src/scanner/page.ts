import { AxeResults } from 'axe-core';
import { AxePuppeteer } from 'axe-puppeteer';
import { inject, optional } from 'inversify';
import * as Puppeteer from 'puppeteer';

export type AxePuppeteerFactory = (page: Puppeteer.Page) => AxePuppeteer;

const axePuppeteerFactoryImpl = (page: Puppeteer.Page) => new AxePuppeteer(page);

export class Page {
    private page: Puppeteer.Page;

    constructor(
        @inject('Browser') private readonly browser: Puppeteer.Browser,
        @inject(axePuppeteerFactoryImpl) @optional() private readonly axePuppeteerFactory: AxePuppeteerFactory = axePuppeteerFactoryImpl,
    ) {}

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
        const axePuppeteer: AxePuppeteer = this.axePuppeteerFactory(this.page);

        return axePuppeteer.analyze();
    }

    public async close(): Promise<void> {
        await this.page.close();
    }
}
