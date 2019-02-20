import { AxePuppeteer } from 'axe-puppeteer';
import { Page } from 'puppeteer';
import * as txt from 'raw-loader!axe-core';

export class AxePuppeteerFactory {
    public createInstance(page: Page): AxePuppeteer {
        return new AxePuppeteer(page, txt as string);
    }
}
