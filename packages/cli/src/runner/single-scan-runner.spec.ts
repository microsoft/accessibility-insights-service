// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { IMock, Mock, Times } from 'typemoq';
import { ReportGenerator } from '../report/report-generator';
import { AIScanner } from '../scanner/ai-scanner';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { SingleScanRunner } from './single-scan-runner';
// tslint:disable: no-empty
describe('SingleScanRunner', () => {
    let scannerMock: IMock<AIScanner>;
    let reportGeneratorMock: IMock<ReportGenerator>;
    let scanResults: AxeScanResults;
    let testSubject: SingleScanRunner;
    // tslint:disable-next-line: no-http-string
    const testUrl = 'http://www.bing.com';
    const htmlReportString = 'html report';
    // tslint:disable-next-line: mocha-no-side-effect-code
    beforeEach(() => {
        scannerMock = Mock.ofType<AIScanner>();
        reportGeneratorMock = Mock.ofType<ReportGenerator>();

        scanResults = {
            // tslint:disable-next-line: no-object-literal-type-assertion
            results: { url: testUrl } as AxeResults,
            pageTitle: 'page title',
            browserSpec: 'browser version',
        };
        testSubject = new SingleScanRunner(scannerMock.object, reportGeneratorMock.object);
    });

    it('getScanReport', async () => {
        scannerMock
            .setup((sm) => sm.scan(testUrl))
            .returns(async () => Promise.resolve(scanResults))
            .verifiable(Times.once());
        reportGeneratorMock
            .setup((rg) => rg.generateReport(scanResults))
            .returns(() => htmlReportString)
            .verifiable(Times.once());
        
        await testSubject.getScanReport(testUrl);

        scannerMock.verifyAll();
        reportGeneratorMock.verifyAll();
    });
});
