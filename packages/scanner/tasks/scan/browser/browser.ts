import * as Puppeteer from 'puppeteer';

import { AxePuppeteerFactory } from '../axe-puppeteer-factory';
import { Page } from './page';

export class Browser {
    constructor(private readonly underlyingBrowser: Puppeteer.Browser, private readonly axePuppeteerFactory: AxePuppeteerFactory) {}

    public async newPage(): Promise<Page> {
        const puppeteerPage = await this.underlyingBrowser.newPage();

        return new Page(puppeteerPage, this.axePuppeteerFactory);
    }

    public async close(): Promise<void> {
        await this.underlyingBrowser.close();
    }
}
