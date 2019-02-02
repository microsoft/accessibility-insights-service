import { Context } from '@azure/functions';
import { AxePuppeteer } from 'axe-puppeteer';
import * as Puppeteer from 'puppeteer';
import { AxePuppeteerFactory } from './AxePuppeteerFactory';

export class Scanner {
    constructor(
        private readonly launchBrowser: typeof Puppeteer.launch,
        private readonly axePuppeteerFactory: AxePuppeteerFactory,
        private readonly context: Context,
    ) {}

    public async scan(url: string): Promise<void> {
        const browser = await this.launchBrowser({
            timeout: 15000,
        });

        const page = await browser.newPage();
        await page.setBypassCSP(true);

        await page.goto(url);
        const axePuppeteer: AxePuppeteer = this.axePuppeteerFactory.getInstance(page);
        const results = await axePuppeteer.analyze();
        this.context.log(results);

        await page.close();
        await browser.close();
    }
}
