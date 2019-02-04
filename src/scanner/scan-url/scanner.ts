import { Context } from '@azure/functions';
import { AxePuppeteer } from 'axe-puppeteer';
import * as Puppeteer from 'puppeteer';
import { AxePuppeteerFactory } from './AxePuppeteerFactory';
import { ResultConverter } from './result-converter';
import { Product, ProductType } from './scan-result';

export class Scanner {
    constructor(
        private readonly launchBrowser: typeof Puppeteer.launch,
        private readonly axePuppeteerFactory: AxePuppeteerFactory,
        private readonly context: Context,
        private readonly resultConverter: ResultConverter,
    ) {}

    public async scan(url: string): Promise<void> {
        const browser = await this.launchBrowser({
            timeout: 15000,
        });

        const page = await browser.newPage();
        await page.setBypassCSP(true);

        await page.goto(url);
        const axePuppeteer: AxePuppeteer = this.axePuppeteerFactory.getInstance(page);
        const axeResults = await axePuppeteer.analyze();
        this.context.log(axeResults);

        const results = this.resultConverter.convert(axeResults, this.buildFakeProductInfo(url));
        this.context.log(results);

        await page.close();
        await browser.close();
    }

    private buildFakeProductInfo(url: string): Product {
        return {
            type: ProductType.web,
            id: 'product id',
            serviceTreeId: 'serviceTree id',
            name: 'product name',
            baseUrl: url,
            version: 'product version',
        };
    }
}
