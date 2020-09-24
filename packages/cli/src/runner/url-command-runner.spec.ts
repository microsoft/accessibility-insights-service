// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { AxeScanResults } from 'scanner-global-library';
import { IMock, Mock, Times } from 'typemoq';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ReportGenerator } from '../report/report-generator';
import { AIScanner } from '../scanner/ai-scanner';
import { ScanArguments } from '../scanner/scan-arguments';
import { URLCommandRunner } from './url-command-runner';

// tslint:disable: no-empty
describe('URLCommandRunner', () => {
    let scannerMock: IMock<AIScanner>;
    let reportGeneratorMock: IMock<ReportGenerator>;
    let reportDiskWriterMock: IMock<ReportDiskWriter>;
    let scanResults: AxeScanResults;
    let testSubject: URLCommandRunner;
    // tslint:disable-next-line: no-http-string
    const testUrl = 'http://www.bing.com';
    const htmlReportString = 'html report';
    const testInput: ScanArguments = { url: testUrl, output: '/users/xyz' };

    // tslint:disable-next-line: mocha-no-side-effect-code
    beforeEach(() => {
        scannerMock = Mock.ofType<AIScanner>();
        reportGeneratorMock = Mock.ofType<ReportGenerator>();
        reportDiskWriterMock = Mock.ofType<ReportDiskWriter>();

        scanResults = {
            // tslint:disable-next-line: no-object-literal-type-assertion
            results: { url: testUrl } as AxeResults,
            pageTitle: 'page title',
            browserSpec: 'browser version',
        };
        testSubject = new URLCommandRunner(scannerMock.object, reportGeneratorMock.object, reportDiskWriterMock.object);
    });

    it('Run Command', async () => {
        scannerMock
            .setup((sm) => sm.scan(testInput.url))
            .returns(async () => Promise.resolve(scanResults))
            .verifiable(Times.once());
        reportGeneratorMock
            .setup((rg) => rg.generateReport(scanResults))
            .returns(() => htmlReportString)
            .verifiable(Times.once());
        reportDiskWriterMock
            .setup((rdwm) => rdwm.writeToDirectory(testInput.output, testInput.url, 'html', htmlReportString))
            .verifiable(Times.once());
        await testSubject.runCommand(testInput);

        scannerMock.verifyAll();
        reportGeneratorMock.verifyAll();
        reportDiskWriterMock.verifyAll();
    });
});
