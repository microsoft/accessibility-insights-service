import { AxeResults } from 'axe-core';
import { AxePuppeteerFactory } from '../scanner/axe-puppeteer-factory';
import { Page } from '../scanner/page';
import { Scanner } from '../scanner/scanner';

export class ScannerTask {
    public async scan(url: string): Promise<AxeResults> {
        const scanner = new Scanner(new Page(runnerContext.browser, new AxePuppeteerFactory()));

        return (await scanner.scan(url)).results;
    }
}
