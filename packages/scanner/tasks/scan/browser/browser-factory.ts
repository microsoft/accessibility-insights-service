import * as Puppeteer from 'puppeteer';

import { AxePuppeteerFactory } from '../axe-puppeteer-factory';
import { Browser } from './browser';

export class BrowserFactory {
    constructor(
        private readonly puppeteer: typeof Puppeteer,
        private readonly chromePath: string,
        private readonly axePuppeteerFactory: AxePuppeteerFactory,
    ) {}

    public async createInstance(): Promise<Browser> {
        const browser = await this.puppeteer.launch({
            headless: true,
            timeout: 15000,
            executablePath: this.chromePath,
            args: ['--disable-dev-shm-usage'],
        });

        return new Browser(browser, this.axePuppeteerFactory);
    }
}
