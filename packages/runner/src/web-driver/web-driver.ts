import * as Puppeteer from 'puppeteer';

export class WebDriver {
    public browser: Puppeteer.Browser;

    constructor(private readonly puppeteer: typeof Puppeteer = Puppeteer) {}

    public async launch(): Promise<Puppeteer.Browser> {
        this.browser = await this.puppeteer.launch({
            headless: true,
            timeout: 15000,
            args: ['--disable-dev-shm-usage'],
        });
        cout('[web-driver] Browser instance is started.');

        return this.browser;
    }

    public async close(browser: Puppeteer.Browser): Promise<void> {
        if (this.browser !== undefined) {
            await browser.close();
            cout('[web-driver] Browser instance has stopped.');
        }
    }
}
