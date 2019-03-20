import { Browser } from 'puppeteer';
import { WebDriver } from '../web-driver/web-driver';

export class WebDriverTask {
    constructor(private readonly webDriver: WebDriver = new WebDriver()) {}

    public async launch(): Promise<Browser> {
        return this.webDriver.launch();
    }

    public async close(browser: Browser): Promise<void> {
        if (browser !== undefined) {
            await this.webDriver.close(browser);
        }
    }
}
