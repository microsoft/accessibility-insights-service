// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Report, reporterFactory } from 'accessibility-insights-report';
import { AxeResults } from 'axe-core';
import { AxePuppeteer } from 'axe-puppeteer';
import { Page } from 'puppeteer';

export interface ScanResult {
    axeResults: AxeResults;
    report?: Report;
}

export class PageScanner {
    // reporterFactory should be instantiated only once per app life cycle.
    // Creating reporterFactory instance multiple times will result Office Fabric
    // warning message: `Applications should only call registerIcons for any given icon once.`
    public static reporter = reporterFactory();

    public constructor(private readonly page: Page) {}

    public async scan(): Promise<ScanResult> {
        const axePuppeteer: AxePuppeteer = new AxePuppeteer(this.page);
        const axeResults = await axePuppeteer.analyze();

        const report = this.createReport(axeResults, this.page.url(), await this.page.title());

        return {
            axeResults,
            report,
        };
    }

    private createReport(axeResults: AxeResults, url: string, title: string): Report {
        return PageScanner.reporter.fromAxeResult({
            results: axeResults,
            serviceName: 'Accessibility Insights CLI',
            description: `Automated report for accessibility scan of URL ${url}`,
            scanContext: {
                pageTitle: title,
            },
        });
    }
}
