// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Report, Reporter, reporterFactory } from 'accessibility-insights-report';
import { AxeResults } from 'axe-core';
import { AxePuppeteer } from 'axe-puppeteer';
import { Page } from 'puppeteer';

export interface ScanResult {
    axeResults: AxeResults;
    report?: Report;
}

export type AxePuppeteerFactory = (page: Page) => AxePuppeteer;

const singeltonReporter = reporterFactory();

export class PageScanner {
    // reporterFactory should be instantiated only once per app life cycle.
    // Creating reporterFactory instance multiple times will result Office Fabric
    // warning message: `Applications should only call registerIcons for any given icon once.`

    public constructor(
        private readonly reporter: Reporter = singeltonReporter,
        private readonly createAxePuppeteerFunc: AxePuppeteerFactory = (page: Page) => new AxePuppeteer(page),
    ) {}

    public async scan(page: Page): Promise<ScanResult> {
        const axePuppeteer: AxePuppeteer = this.createAxePuppeteerFunc(page);
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
