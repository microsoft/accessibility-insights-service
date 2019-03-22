import * as Puppeteer from 'puppeteer';

export class WebDriver {
    public browser: Puppeteer.Browser;

    constructor(private readonly puppeteer: typeof Puppeteer = Puppeteer) {}

    public async launch(): Promise<Puppeteer.Browser> {
        const result = await this.puppeteer.launch({
            headless: true,
            timeout: 15000,
            args: ['--disable-dev-shm-usage'],
        });
        cout('[web-driver] Browser instance has started.');

        // TODO remove context
        runnerContext.browser = result;
        this.browser = result;

        return result;
    }

    public async close(browser: Puppeteer.Browser): Promise<void> {
        const result = browser.close();
        cout('[web-driver] Browser instance has terminated.');

        return result;
    }
}
