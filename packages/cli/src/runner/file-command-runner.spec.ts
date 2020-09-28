// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as fs from 'fs';
import { AxeScanResults } from 'scanner-global-library';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ReportGenerator } from '../report/report-generator';
import { ReportNameGenerator } from '../report/report-name-generator';
import { AIScanner } from '../scanner/ai-scanner';
import { ScanArguments } from '../scanner/scan-arguments';
import { FileCommandRunner } from './file-command-runner';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

describe(FileCommandRunner, () => {
    let scannerMock: IMock<AIScanner>;
    let reportGeneratorMock: IMock<ReportGenerator>;
    let reportDiskWriterMock: IMock<ReportDiskWriter>;
    let fsMock: IMock<typeof fs>;
    let reportNameGeneratorMock: IMock<ReportNameGenerator>;
    let testSubject: FileCommandRunner;
    const testInputFile = 'input file';
    const testInput: ScanArguments = { inputFile: testInputFile, output: '/users/xyz' };

    beforeEach(() => {
        reportGeneratorMock = Mock.ofType<ReportGenerator>();
        reportDiskWriterMock = Mock.ofType<ReportDiskWriter>();
        reportNameGeneratorMock = Mock.ofType<ReportNameGenerator>();
        scannerMock = Mock.ofType<AIScanner>();
        fsMock = Mock.ofInstance(fs, MockBehavior.Strict);

        testSubject = new FileCommandRunner(
            scannerMock.object,
            reportGeneratorMock.object,
            reportDiskWriterMock.object,
            reportNameGeneratorMock.object,
            fsMock.object,
        );
    });

    describe('runCommand', () => {
        let fileContent: string;

        beforeEach(() => {
            fsMock
                .setup((f) => f.readFileSync(testInput.inputFile, 'utf-8'))
                .returns(() => fileContent)
                .verifiable(Times.once());

            setupScanAndReportWriteCalls();
        });

        it('with valid file content', async () => {
            fileContent = `
            pass-url-1\r\n
            fail-url-1
            un-scannable-internal-error
            pass-url-2\n
            fail-url-2
            un-scannable-browser-error
        `;

            await testSubject.runCommand(testInput);
        });

        it('with un scannable urls only', async () => {
            fileContent = `
            un-scannable-internal-error
            un-scannable-browser-error
            `;

            await testSubject.runCommand(testInput);
        });

        it('with invalid file content', async () => {
            fileContent = `
            \r\n
        `;

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

            await testSubject.runCommand(testInput);
        });
    });
    afterEach(() => {
        fsMock.verifyAll();
        scannerMock.verifyAll();
        reportGeneratorMock.verifyAll();
        reportDiskWriterMock.verifyAll();
        reportNameGeneratorMock.verifyAll();
    });

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
            .setup((s) => s.scan(It.is((url) => url.startsWith('un-scannable-browser-error'))))
            .returns(async (url: string) => {
                const result = {
                    results: {
                        passes: [],
                        violations: [],
                    },
                    error: {
                        errorType: 'InvalidUrl',
                        statusCode: 500,
                        message: 'invalid url',
                        stack: 'unable to scan',
                    },
                } as AxeScanResults;

                setupErrorReportCreationCalls(url);

                return result;
            })
            .verifiable(Times.atLeast(0));

        scannerMock
            .setup((s) => s.scan(It.is((url) => url.startsWith('un-scannable-internal-error'))))
            .returns(async (url: string) => {
                return {
                    results: {
                        passes: [],
                        violations: [],
                    },
                    error: {
                        message: 'unable to scan',
                    },
                } as AxeScanResults;
            })
            .verifiable(Times.atLeast(0));

        scannerMock
            .setup((s) => s.getUserAgent())
            .returns(() => 'user agent')
            .verifiable(Times.atLeast(0));
    }

    function setupReportCreationCalls(url: string, result: AxeScanResults): void {
        reportGeneratorMock
            .setup((r) => r.generateReport(result))
            .returns(() => 'report-content')
            .verifiable(Times.once());

        reportDiskWriterMock
            .setup((r) => r.writeToDirectory(`${testInput.output}\\data`, url, 'html', 'report-content'))
            .returns(() => `${url}-report`)
            .verifiable(Times.once());
    }

    function setupErrorReportCreationCalls(url: string): void {
        reportDiskWriterMock
            .setup((r) => r.writeToDirectory(`${testInput.output}\\data`, url, 'txt', 'unable to scan'))
            .returns(() => `${url}-report`)
            .verifiable(Times.once());
    }
});
