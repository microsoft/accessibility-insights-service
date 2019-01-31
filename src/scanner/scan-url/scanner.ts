import * as Puppeteer from 'puppeteer';
import { AxePuppeteerUtils } from './AxePuppeteerUtils';

export class Scanner {
    constructor(private readonly launchBrowser: typeof Puppeteer.launch, private readonly axePuppeteerUtils: AxePuppeteerUtils) {}

    public async scan(url: string): Promise<void> {
        const browser = await this.launchBrowser({
            timeout: 15000,
        });

        const page = await browser.newPage();
        await page.setBypassCSP(true);

        await page.goto(url);
        this.axePuppeteerUtils.init(page);
        const results = await this.axePuppeteerUtils.analyze();
        console.log(results);

        await page.close();
        await browser.close();
    }
}
