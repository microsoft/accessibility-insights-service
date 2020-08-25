// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Report, Reporter } from 'accessibility-insights-report';
import { AxeResults } from 'axe-core';
import { AxePuppeteer } from 'axe-puppeteer';
import { inject, injectable } from 'inversify';
import { Page } from 'puppeteer';
import { AxePuppeteerFactory } from '../axe-puppeteer/axe-puppeteer-factory';

export interface ScanResult {
    axeResults: AxeResults;
    report?: Report;
}

@injectable()
export class PageScanner {
    public constructor(
        @inject('ReporterFactory') private readonly reporter: Reporter,
        @inject(AxePuppeteerFactory) private readonly axePuppeteerFactory: AxePuppeteerFactory,
    ) {}

    public async scan(page: Page): Promise<ScanResult> {
        const axePuppeteer: AxePuppeteer = this.axePuppeteerFactory.createAxePuppeteer(page);
        const axeResults = await axePuppeteer.analyze();

        const report = this.createReport(axeResults, page.url(), await page.title());

        return {
            axeResults,
            report,
        };
    }

    private createReport(axeResults: AxeResults, url: string, title: string): Report {
        return this.reporter.fromAxeResult({
            results: axeResults,
            serviceName: 'Accessibility Insights CLI',
            description: `Automated report for accessibility scan of URL ${url}`,
            scanContext: {
                pageTitle: title,
            },
        });
    }
}
