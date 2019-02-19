import { AxeResults } from 'axe-core';

import { BrowserFactory } from './browser/browser-factory';

export class Scanner {
    constructor(private readonly browserFactory: BrowserFactory) {}

    public async scan(url: string): Promise<AxeResults> {
        const browser = await this.browserFactory.createInstance();

        const page = await browser.newPage();
        await page.enableBypassCSP();

        await page.goto(url);

        const axeResults = await page.scanForA11yIssues();

        await browser.close();

        return axeResults;
    }
}
