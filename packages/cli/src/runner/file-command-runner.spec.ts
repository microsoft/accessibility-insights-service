// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as fs from 'fs';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ReportGenerator } from '../report/report-generator';
import { ConsoleSummaryReportGenerator } from '../report/summary-report/console-summary-report-generator';
import { HtmlSummaryReportGenerator } from '../report/summary-report/html-summary-report-generator';
import { JsonSummaryReportGenerator } from '../report/summary-report/json-summary-report-generator';
import { SummaryReportData, UrlToReportMap, ViolationCountMap } from '../report/summary-report/summary-report-data';
import { AIScanner } from '../scanner/ai-scanner';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { ScanArguments } from '../scanner/scan-arguments';
import { FileCommandRunner } from './file-command-runner';

// tslint:disable: no-object-literal-type-assertion non-literal-fs-path

describe(FileCommandRunner, () => {
    let scannerMock: IMock<AIScanner>;
    let reportGeneratorMock: IMock<ReportGenerator>;
    let reportDiskWriterMock: IMock<ReportDiskWriter>;
    let fsMock: IMock<typeof fs>;
    let jsonSummaryReportGeneratorMock: IMock<JsonSummaryReportGenerator>;
    let htmlSummaryReportGeneratorMock: IMock<HtmlSummaryReportGenerator>;
    let consoleSummaryReportGeneratorMock: IMock<ConsoleSummaryReportGenerator>;
    let testSubject: FileCommandRunner;
    const testInputFile = 'input file';
    const testInput: ScanArguments = { inputFile: testInputFile, output: '/users/xyz' };

    beforeEach(() => {
        scannerMock = Mock.ofType(AIScanner, MockBehavior.Strict);
        reportGeneratorMock = Mock.ofType(ReportGenerator, MockBehavior.Strict);
        reportDiskWriterMock = Mock.ofType(ReportDiskWriter, MockBehavior.Strict);
        jsonSummaryReportGeneratorMock = Mock.ofType(JsonSummaryReportGenerator, MockBehavior.Strict);
        htmlSummaryReportGeneratorMock = Mock.ofType(HtmlSummaryReportGenerator, MockBehavior.Strict);
        consoleSummaryReportGeneratorMock = Mock.ofType(ConsoleSummaryReportGenerator, MockBehavior.Strict);
        fsMock = Mock.ofInstance(fs, MockBehavior.Strict);

        testSubject = new FileCommandRunner(
            scannerMock.object,
            reportGeneratorMock.object,
            reportDiskWriterMock.object,
            jsonSummaryReportGeneratorMock.object,
            htmlSummaryReportGeneratorMock.object,
            consoleSummaryReportGeneratorMock.object,
            fsMock.object,
        );
    });

    describe('runCommand', () => {
        let fileContent: string;

        beforeEach(() => {
            fsMock
                .setup((f) => f.readFileSync(testInput.inputFile, 'UTF-8'))
                .returns(() => fileContent)
                .verifiable(Times.once());

            setupScanAndReportWriteCalls();
        });

        it('with valid file content', async () => {
            fileContent = `
            pass-url-1\r\n
            fail-url-1
            un-scannable-url-1
            pass-url-2\n
            fail-url-2
            un-scannable-url-2
        `;
            const allViolationsCountRuleMap: ViolationCountMap = {
                'fail-url-1-rule-1': 1,
                'fail-url-1-rule-2': 2,
                'fail-url-2-rule-1': 1,
                'fail-url-2-rule-2': 2,
                'common-fail-rule1': 2,
            };
            const failedUrlToReportMap: UrlToReportMap = {
                'fail-url-1': 'fail-url-1-report',
                'fail-url-2': 'fail-url-2-report',
            };

            const passedUrlToReportMap: UrlToReportMap = {
                'pass-url-1': 'pass-url-1-report',
                'pass-url-2': 'pass-url-2-report',
            };
            const unScannableUrls = ['un-scannable-url-1', 'un-scannable-url-2'];

            const expectedSummaryData: SummaryReportData = {
                failedUrlToReportMap: failedUrlToReportMap,
                passedUrlToReportMap: passedUrlToReportMap,
                unScannableUrls: unScannableUrls,
                violationCountByRuleMap: allViolationsCountRuleMap,
            };

            setupSummaryFileCreationCall(expectedSummaryData);

            await testSubject.runCommand(testInput);
        });

        it('with un scannable urls only', async () => {
            fileContent = `
            un-scannable-url-1
            un-scannable-url-2
            `;

            const expectedSummaryData: SummaryReportData = {
                failedUrlToReportMap: {},
                passedUrlToReportMap: {},
                unScannableUrls: ['un-scannable-url-1', 'un-scannable-url-2'],
                violationCountByRuleMap: {},
            };

            setupSummaryFileCreationCall(expectedSummaryData);

            await testSubject.runCommand(testInput);
        });

        it('with invalid file content', async () => {
            fileContent = `
            \r\n
        `;

            const expectedSummaryData: SummaryReportData = {
                failedUrlToReportMap: {},
                passedUrlToReportMap: {},
                unScannableUrls: [],
                violationCountByRuleMap: {},
            };

            setupSummaryFileCreationCall(expectedSummaryData);

            await testSubject.runCommand(testInput);
        });

        it('when violations is undefined', async () => {
            fileContent = `
            pass-url-1
        `;

            scannerMock.reset();
            scannerMock
                .setup((s) => s.scan('pass-url-1'))
                .returns(async (url: string) => {
                    const result = {
                        results: {
                            passes: [
                                {
                                    id: `${url}-rule-1`,
                                    nodes: [{}],
                                },
                            ],
                        },
                    } as AxeScanResults;

                    setupReportCreationCalls(url, result);

                    return result;
                })
                .verifiable(Times.atLeast(0));

            const expectedSummaryData: SummaryReportData = {
                failedUrlToReportMap: {},
                passedUrlToReportMap: {
                    'pass-url-1': 'pass-url-1-report',
                },
                unScannableUrls: [],
                violationCountByRuleMap: {},
            };

            setupSummaryFileCreationCall(expectedSummaryData);

            await testSubject.runCommand(testInput);
        });
    });
    afterEach(() => {
        fsMock.verifyAll();
        scannerMock.verifyAll();
        reportGeneratorMock.verifyAll();
        reportDiskWriterMock.verifyAll();
        jsonSummaryReportGeneratorMock.verifyAll();
        htmlSummaryReportGeneratorMock.verifyAll();
        consoleSummaryReportGeneratorMock.verifyAll();
    });

    function setupSummaryFileCreationCall(expectedSummaryData: SummaryReportData): void {
        consoleSummaryReportGeneratorMock.setup((c) => c.generateReport(It.isValue(expectedSummaryData))).verifiable(Times.once());

        jsonSummaryReportGeneratorMock
            .setup((c) => c.generateReport(It.isValue(expectedSummaryData)))
            .returns(() => 'json-summary-data')
            .verifiable(Times.once());
        htmlSummaryReportGeneratorMock
            .setup((c) => c.generateReport(It.isValue(expectedSummaryData)))
            .returns(() => 'html-summary-data')
            .verifiable(Times.once());

        reportDiskWriterMock
            .setup((r) => r.writeToDirectory(testInput.output, 'scan-summary', 'json', 'json-summary-data'))
            .returns(() => 'json-summary-data.json')
            .verifiable(Times.once());

        reportDiskWriterMock
            .setup((r) => r.writeToDirectory(testInput.output, 'scan-summary', 'html', 'html-summary-data'))
            .returns(() => 'html-summary-data.html')
            .verifiable(Times.once());
    }

    function setupScanAndReportWriteCalls(): void {
        scannerMock
            .setup((s) => s.scan(It.is((url) => url.startsWith('pass'))))
            .returns(async (url: string) => {
                const result = {
                    results: {
                        passes: [
                            {
                                id: `${url}-rule-1`,
                                nodes: [{}],
                            },
                        ],
                        violations: [],
                    },
                } as AxeScanResults;

                setupReportCreationCalls(url, result);

                return result;
            })
            .verifiable(Times.atLeast(0));

        scannerMock
            .setup((s) => s.scan(It.is((url) => url.startsWith('fail'))))
            .returns(async (url: string) => {
                const result = {
                    results: {
                        passes: [
                            {
                                id: 'passed-id1',
                                nodes: [{}],
                            },
                        ],
                        violations: [
                            {
                                id: `${url}-rule-1`,
                                nodes: [{}],
                            },
                            {
                                id: `${url}-rule-2`,
                                nodes: [{}, {}],
                            },
                            {
                                id: 'common-fail-rule1',
                                nodes: [{}],
                            },
                        ],
                    },
                } as AxeScanResults;

                setupReportCreationCalls(url, result);

                return result;
            })
            .verifiable(Times.atLeast(0));

        scannerMock
            .setup((s) => s.scan(It.is((url) => url.startsWith('un-scannable'))))
            .returns((url) =>
                Promise.resolve({
                    error: {
                        message: 'unable to scan',
                    },
                } as AxeScanResults),
            )
            .verifiable(Times.atLeast(0));
    }

    function setupReportCreationCalls(url: string, result: AxeScanResults): void {
        reportGeneratorMock
            .setup((r) => r.generateReport(result))
            .returns(() => 'report-content')
            .verifiable(Times.once());

        reportDiskWriterMock
            .setup((r) => r.writeToDirectory(testInput.output, url, 'html', 'report-content'))
            .returns(() => `${url}-report`)
            .verifiable(Times.once());
    }
});
