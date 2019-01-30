import * as Puppeteer from 'puppeteer';

export class Scanner {
    constructor(private readonly launchBrowser: typeof Puppeteer.launch) {}
    public async scan(url: string): Promise<void> {
        const browser = await this.launchBrowser({
            timeout: 15000,
        });

        const page = await browser.newPage();
        await page.goto(url);

        await browser.close();
    }
}
