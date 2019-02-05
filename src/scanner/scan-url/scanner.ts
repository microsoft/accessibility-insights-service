import { Context } from '@azure/functions';
import { AxePuppeteer } from 'axe-puppeteer';
import * as Puppeteer from 'puppeteer';

import { AxePuppeteerFactory } from './axe-puppeteer-factory';

export class Scanner {
    constructor(
        private readonly puppeteer: typeof Puppeteer,
        private readonly axePuppeteerFactory: AxePuppeteerFactory,
        private readonly context: Context,
    ) {}

    public async scan(url: string): Promise<void> {
        const browser = await this.puppeteer.launch({
            headless: true,
            timeout: 15000,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();
        await page.setBypassCSP(true);

        await page.goto(url);
        const axePuppeteer: AxePuppeteer = this.axePuppeteerFactory.createInstance(page);
        const results = await axePuppeteer.analyze();
        this.context.log(results);

        await page.close();
        await browser.close();
    }
}
