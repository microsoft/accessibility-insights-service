import { inject } from 'inversify';
import { Browser } from 'puppeteer';
import { WebDriver } from '../web-driver/web-driver';

export class WebDriverTask {
    private readonly webDriver: WebDriver;

    constructor(@inject(WebDriver) webDriver: WebDriver) {
        this.webDriver = webDriver;
    }

    public async launch(): Promise<Browser> {
        return this.webDriver.launch();
    }

    public async close(): Promise<void> {
        await this.webDriver.close();
    }
}
