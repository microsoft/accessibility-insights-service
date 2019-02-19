import { AxePuppeteer } from 'axe-puppeteer';
import { Page } from 'puppeteer';

export class AxePuppeteerFactory {
    public createInstance(page: Page): AxePuppeteer {
        return new AxePuppeteer(page);
    }
}
