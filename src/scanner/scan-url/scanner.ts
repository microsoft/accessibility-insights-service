import { Context } from '@azure/functions';
import { AxePuppeteer } from 'axe-puppeteer';
import * as Puppeteer from 'puppeteer';
import { AxePuppeteerFactory } from './AxePuppeteerFactory';
import { ResultConverter } from './result-converter';
import { Product, ProductType } from './scan-result';
//import * as fs from 'fs';
import * as sha256 from './sha256';

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
        const axeResults = await axePuppeteer.analyze();

        const results = new ResultConverter().convert(axeResults, this.buildFakeProductInfo(url));
        this.context.log(results.length);
        // tslint:disable-next-line:no-any
        // fs.writeFile('./convertedResult.json', JSON.stringify(results), (err: any) => {
        //     if (err) {
        //         this.context.log(err);

        //         return;
        //     }
        //     this.context.log('Converted File has been created');
        // });

        this.context.log('output from sha256: ' + sha256.computeHash('abcdefg'));
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
