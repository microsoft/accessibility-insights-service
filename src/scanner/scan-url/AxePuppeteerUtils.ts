import { AxeResults } from 'axe-core';
import { AxePuppeteer } from 'axe-puppeteer';
import { Page } from 'puppeteer';

export class AxePuppeteerUtils {
    private axePuppeteer: AxePuppeteer;

    public init(page: Page): void {
        this.axePuppeteer = new AxePuppeteer(page);
    }

    public async analyze(): Promise<AxeResults> {
        return this.axePuppeteer.analyze();
    }
}
