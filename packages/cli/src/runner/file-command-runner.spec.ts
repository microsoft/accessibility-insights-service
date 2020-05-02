// // Copyright (c) Microsoft Corporation. All rights reserved.
// // Licensed under the MIT License.

import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { IMock, Mock, Times, MockBehavior, It } from 'typemoq';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ReportGenerator } from '../report/report-generator';
import { AIScanner } from '../scanner/ai-scanner';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { ScanArguments } from '../scanner/scan-arguments';
import { FileCommandRunner } from './file-command-runner';
import * as fs from 'fs';
import * as lodash from 'lodash';
import { JsonSummaryReportGenerator } from '../report/summary-report/json-summary-report-generator';
import { ConsoleSummaryReportGenerator } from '../report/summary-report/console-summary-report-generator';

// tslint:disable: no-empty
describe('FileCommandRunner', () => {
    let scannerMock: IMock<AIScanner>;
    let reportGeneratorMock: IMock<ReportGenerator>;
    let reportDiskWriterMock: IMock<ReportDiskWriter>;
    let fsMock: IMock<typeof fs>;
    let lodashMock: IMock<typeof lodash>;
    let jsonSummaryReportGeneratorMock: IMock<JsonSummaryReportGenerator>;
    let consoleSummaryReportGeneratorMock: IMock<ConsoleSummaryReportGenerator>;
    let scanResults: AxeScanResults;
    let testSubject: FileCommandRunner;
    const testInputFile = 'innput file';
    const htmlReportString = 'html report';
    const testInput: ScanArguments = { inputFile: testInputFile, output: '/users/xyz' };
    const lines = 'https://www.bing.com';
    // tslint:disable-next-line: mocha-no-side-effect-code
    beforeEach(() => {
        scannerMock = Mock.ofType<AIScanner>();
        reportGeneratorMock = Mock.ofType<ReportGenerator>();
        reportDiskWriterMock = Mock.ofType<ReportDiskWriter>();
        jsonSummaryReportGeneratorMock = Mock.ofType<JsonSummaryReportGenerator>();
        consoleSummaryReportGeneratorMock = Mock.ofType<ConsoleSummaryReportGenerator>();
        fsMock = Mock.ofInstance(fs, MockBehavior.Strict);
        lodashMock = Mock.ofInstance(lodash, MockBehavior.Strict);


        scanResults = {
            // tslint:disable-next-line: no-object-literal-type-assertion
            results: { url: lines } as AxeResults,
            pageTitle: 'page title',
            browserSpec: 'browser version',
        };

        testSubject = new FileCommandRunner(scannerMock.object, reportGeneratorMock.object, reportDiskWriterMock.object, jsonSummaryReportGeneratorMock.object, consoleSummaryReportGeneratorMock.object, fsMock.object, lodashMock.object);
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

        fsMock
            .setup((fsm) => fsm.readFileSync(testInput.inputFile, 'UTF-8'))
            .returns(() => lines)
            .verifiable(Times.once());

        lodashMock
            .setup((fsm) => fsm.cloneDeep(It.isAny()))
            .returns(() => scannerMock.object)
            .verifiable(Times.once());

        await testSubject.runCommand(testInput);

        verifyMocks();
    });

    function verifyMocks(): void {
        fsMock.verifyAll();
        scannerMock.verifyAll();
        reportGeneratorMock.verifyAll();
        reportDiskWriterMock.verifyAll();
        jsonSummaryReportGeneratorMock.verifyAll();
        consoleSummaryReportGeneratorMock.verifyAll();
    }
});
