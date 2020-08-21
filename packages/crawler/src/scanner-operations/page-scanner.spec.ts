// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Report, Reporter } from 'accessibility-insights-report';
import { AxeResults } from 'axe-core';
import { AxePuppeteer } from 'axe-puppeteer';
import { Page } from 'puppeteer';
import { IMock, Mock } from 'typemoq';
import { AxePuppeteerFactory } from '../factories/axe-puppeteer-factory';
import { PageScanner } from './page-scanner';

// tslint:disable: no-any

describe(PageScanner, () => {
    let reporterMock: IMock<Reporter>;
    let createAxePuppeteerMock: IMock<AxePuppeteerFactory>;
    let axePuppeteerMock: IMock<AxePuppeteer>;

    const pageUrl = 'test url';
    const pageTitle = 'page title';
    let pageStub: Page;
    let axeResults: AxeResults;

    let pageScanner: PageScanner;

    beforeEach(() => {
        pageStub = {
            url: () => pageUrl,
            title: () => pageTitle,
        } as any;
        axeResults = {
            results: 'axe results',
        } as any;

        reporterMock = Mock.ofType<Reporter>();
        createAxePuppeteerMock = Mock.ofType<AxePuppeteerFactory>();
        axePuppeteerMock = Mock.ofType<AxePuppeteer>();
        createAxePuppeteerMock.setup((cap) => cap.createAxePuppeteer(pageStub)).returns(() => axePuppeteerMock.object);

        pageScanner = new PageScanner(reporterMock.object, createAxePuppeteerMock.object);
    });

    afterEach(() => {
        axePuppeteerMock.verifyAll();
        reporterMock.verifyAll();
    });

    it('returns axe results', async () => {
        setupAxeResults();

        const scanResults = await pageScanner.scan(pageStub);

        expect(scanResults.axeResults).toBe(axeResults);
    });

    it('returns report', async () => {
        const report: Report = {
            asHTML: () => 'html',
        };
        const expectedReportParameters = {
            results: axeResults,
            serviceName: 'Accessibility Insights CLI',
            description: `Automated report for accessibility scan of URL ${pageUrl}`,
            scanContext: {
                pageTitle: pageTitle,
            },
        };

        setupAxeResults();
        reporterMock
            .setup((r) => r.fromAxeResult(expectedReportParameters))
            .returns(() => report)
            .verifiable();

        const scanResults = await pageScanner.scan(pageStub);

        expect(scanResults.report).toBe(report);
    });

    function setupAxeResults(): void {
        axePuppeteerMock
            .setup((ap) => ap.analyze())
            .returns(async () => Promise.resolve(axeResults))
            .verifiable();
    }
});
