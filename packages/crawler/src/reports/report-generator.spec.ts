// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Report, Reporter } from 'accessibility-insights-report';
import { AxeResults } from 'axe-core';
import { IMock, Mock } from 'typemoq';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { ReportGenerator } from './report-generator';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(ReportGenerator, () => {
    const pageUrl = 'test url';
    const pageTitle = 'page title';

    let reporterMock: IMock<Reporter>;
    let axeResults: AxeResults;
    let reportGenerator: ReportGenerator;

    beforeEach(() => {
        axeResults = {
            results: 'axe results',
        } as any;

        reporterMock = getPromisableDynamicMock(Mock.ofType<Reporter>());
        reportGenerator = new ReportGenerator(() => reporterMock.object);
    });

    afterEach(() => {
        reporterMock.verifyAll();
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
        reporterMock
            .setup((r) => r.fromAxeResult(expectedReportParameters))
            .returns(() => report)
            .verifiable();

        const actualReport = await reportGenerator.generateReport(axeResults, pageUrl, pageTitle);

        expect(actualReport).toBe(report);
    });
});
