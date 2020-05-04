// // Copyright (c) Microsoft Corporation. All rights reserved.
// // Licensed under the MIT License.

import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import * as fs from 'fs';
import * as lodash from 'lodash';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ReportGenerator } from '../report/report-generator';
import { ConsoleSummaryReportGenerator } from '../report/summary-report/console-summary-report-generator';
import { JsonSummaryReportGenerator } from '../report/summary-report/json-summary-report-generator';
import { AIScanner } from '../scanner/ai-scanner';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { ScanArguments } from '../scanner/scan-arguments';
import { FileCommandRunner } from './file-command-runner';

// tslint:disable: no-empty no-unsafe-any no-any
describe('FileCommandRunner', () => {
    let scannerMock: IMock<AIScanner>;
    let reportGeneratorMock: IMock<ReportGenerator>;
    let reportDiskWriterMock: IMock<ReportDiskWriter>;
    let fsMock: IMock<typeof fs>;
    // let lodashMock: IMock<typeof lodash>;
    let lodashStub: any;
    let jsonSummaryReportGeneratorMock: IMock<JsonSummaryReportGenerator>;
    let consoleSummaryReportGeneratorMock: IMock<ConsoleSummaryReportGenerator>;
    let testSubject: FileCommandRunner;
    const testInputFile = 'innput file';
    const htmlReportString = 'html report';
    const testInput: ScanArguments = { inputFile: testInputFile, output: '/users/xyz' };
    // tslint:disable-next-line: mocha-no-side-effect-code

    describe('Run Command', () => {
        beforeEach(() => {
            scannerMock = Mock.ofType<AIScanner>();
            reportGeneratorMock = Mock.ofType<ReportGenerator>();
            reportDiskWriterMock = Mock.ofType<ReportDiskWriter>();
            jsonSummaryReportGeneratorMock = Mock.ofType<JsonSummaryReportGenerator>();
            consoleSummaryReportGeneratorMock = Mock.ofType<ConsoleSummaryReportGenerator>();
            fsMock = Mock.ofInstance(fs, MockBehavior.Strict);
            // lodashMock = Mock.ofInstance(lodash, MockBehavior.Strict);

            lodashStub = {
                cloneDeep: (scanner: AIScanner) => scanner,
                isEmpty: (value: string) => lodash.isEmpty(value),
            };
            testSubject = new FileCommandRunner(
                scannerMock.object,
                reportGeneratorMock.object,
                reportDiskWriterMock.object,
                jsonSummaryReportGeneratorMock.object,
                consoleSummaryReportGeneratorMock.object,
                fsMock.object,
                lodashStub,
            );
        });

        it('No Violation', async () => {
            const lines = 'https://www.url1.com';
            const jsonSummary = 'summary json';
            const consoleSummary = 'console summary';
            const scanResults = {
                // tslint:disable-next-line: no-object-literal-type-assertion
                results: { url: lines } as AxeResults,
            } as AxeScanResults;

            scannerMock
                .setup((sm) => sm.scan(lines))
                .returns(async () => Promise.resolve(scanResults))
                .verifiable(Times.once());

            reportGeneratorMock
                .setup((rg) => rg.generateReport(scanResults))
                .returns(() => htmlReportString)
                .verifiable(Times.once());

            reportDiskWriterMock
                .setup((rdwm) => rdwm.writeToDirectory(testInput.output, lines, 'html', htmlReportString))
                .returns(() => 'url1.html')
                .verifiable(Times.once());

            reportDiskWriterMock
                .setup((rdwm) => rdwm.writeToDirectory(testInput.output, 'ViolationCountByRuleMap', 'json', jsonSummary))
                .returns(() => 'summary.json')
                .verifiable(Times.once());

            jsonSummaryReportGeneratorMock
                .setup((rdwm) => rdwm.generateReport(It.isAny()))
                .returns(() => jsonSummary)
                .verifiable(Times.once());

            consoleSummaryReportGeneratorMock
                .setup((rdwm) => rdwm.generateReport(It.isAny()))
                .returns(() => consoleSummary)
                .verifiable(Times.once());

            fsMock
                .setup((fsm) => fsm.readFileSync(testInput.inputFile, 'UTF-8'))
                .returns(() => lines)
                .verifiable(Times.once());

            await testSubject.runCommand(testInput);

            verifyMocks();
        });

        it('Violation, Duplication', async () => {
            const lines = 'https://www.url1.com \n https://www.url1.com \n https://www.url2.com';
            const jsonSummary = 'summary json';
            const consoleSummary = 'console summary';
            const scanResults = {
                // tslint:disable-next-line: no-object-literal-type-assertion
                results: {
                    url: lines,
                    violations: [
                        {
                            id: 'id1',
                            nodes: [{}],
                        },
                    ],
                } as AxeResults,
            } as AxeScanResults;

            scannerMock
                .setup((sm) => sm.scan(It.isAny()))
                .returns(async () => Promise.resolve(scanResults))
                .verifiable(Times.exactly(2));

            reportGeneratorMock
                .setup((rg) => rg.generateReport(scanResults))
                .returns(() => htmlReportString)
                .verifiable(Times.exactly(2));

            reportDiskWriterMock
                .setup((rdwm) => rdwm.writeToDirectory(testInput.output, It.isAny(), 'html', htmlReportString))
                .returns(() => 'url1.html')
                .verifiable(Times.exactly(2));

            reportDiskWriterMock
                .setup((rdwm) => rdwm.writeToDirectory(testInput.output, 'ViolationCountByRuleMap', 'json', jsonSummary))
                .returns(() => 'summary.json')
                .verifiable(Times.once());

            jsonSummaryReportGeneratorMock
                .setup((rdwm) => rdwm.generateReport(It.isAny()))
                .returns(() => jsonSummary)
                .verifiable(Times.once());

            consoleSummaryReportGeneratorMock
                .setup((rdwm) => rdwm.generateReport(It.isAny()))
                .returns(() => consoleSummary)
                .verifiable(Times.once());

            fsMock
                .setup((fsm) => fsm.readFileSync(testInput.inputFile, 'UTF-8'))
                .returns(() => lines)
                .verifiable(Times.once());

            await testSubject.runCommand(testInput);

            verifyMocks();
        });
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
