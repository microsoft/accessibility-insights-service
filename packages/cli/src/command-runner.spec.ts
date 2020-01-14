// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import * as filenamify from 'filenamify-url';
import * as fs from 'fs';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { CommandRunner } from './command-runner';
import { ReportGenerator } from './report/report-generator';
import { AIScanner } from './scanner/ai-scanner';
import { AxeScanResults } from './scanner/axe-scan-results';
import { ScanArguments } from './scanner/scan-arguments';
// tslint:disable: no-empty
describe('Command Runner', () => {
    let scannerMock: IMock<AIScanner>;
    let reportGeneratorMock: IMock<ReportGenerator>;
    let scanResults: AxeScanResults;
    let testSubject: CommandRunner;
    let fsMock: IMock<typeof fs>;
    // tslint:disable-next-line: no-http-string
    const testUrl = 'http://www.bing.com';
    const htmlReportString = 'html report';
    const testInput: ScanArguments = { url: testUrl, output: '/users/xyz' };
    const testInputWithoutOutput: ScanArguments = { url: testUrl };
    // tslint:disable-next-line: mocha-no-side-effect-code
    const reportFileName = `${testInput.output}/${filenamify(testInput.url, { replacement: '_' })}.html`;
    beforeEach(() => {
        scannerMock = Mock.ofType<AIScanner>();
        reportGeneratorMock = Mock.ofType<ReportGenerator>();
        fsMock = Mock.ofInstance(fs, MockBehavior.Strict);
        scanResults = {
            // tslint:disable-next-line: no-object-literal-type-assertion
            results: { url: testUrl } as AxeResults,
            pageTitle: 'page title',
            browserSpec: 'browser version',
        };
        testSubject = new CommandRunner(scannerMock.object, reportGeneratorMock.object, fsMock.object);
    });

    describe('scan with output parameter specified', () => {
        it('output directory exists', async () => {
            fsMock
                .setup(fsm => fsm.existsSync(testInput.output))
                .returns(() => true)
                .verifiable(Times.once());
            fsMock
                .setup(fsm => fsm.writeFileSync(reportFileName, htmlReportString))
                .returns(() => {})
                .verifiable(Times.once());
            fsMock
                .setup(fsm => fsm.mkdirSync(testInput.output))
                .returns(() => {})
                .verifiable(Times.never());

            scannerMock.setup(sm => sm.scan(testInput.url)).returns(async () => Promise.resolve(scanResults));
            reportGeneratorMock.setup(rg => rg.generateReport(scanResults)).returns(() => htmlReportString);
            // tslint:disable-next-line: no-floating-promises
            await testSubject.runCommand(testInput);

            verifyMocks();
        });

        it('output directory does not exists', async () => {
            fsMock
                .setup(fsm => fsm.existsSync(testInput.output))
                .returns(() => false)
                .verifiable(Times.once());
            fsMock
                .setup(fsm => fsm.writeFileSync(reportFileName, htmlReportString))
                .returns(() => {})
                .verifiable(Times.once());
            fsMock
                .setup(fsm => fsm.mkdirSync(testInput.output))
                .returns(() => {})
                .verifiable(Times.once());

            scannerMock.setup(sm => sm.scan(testInput.url)).returns(async () => Promise.resolve(scanResults));
            reportGeneratorMock.setup(rg => rg.generateReport(scanResults)).returns(() => htmlReportString);
            // tslint:disable-next-line: no-floating-promises
            await testSubject.runCommand(testInput);

            verifyMocks();
        });
    });
    describe('scan without output parameter specified', () => {
        it('scan url', async () => {
            const reportFileNameWithoutOutput = `./${filenamify(testInputWithoutOutput.url, {
                replacement: '_',
            })}.html`;
            fsMock
                .setup(fsm => fsm.existsSync('.'))
                .returns(() => true)
                .verifiable(Times.once());
            fsMock
                .setup(fsm => fsm.writeFileSync(reportFileNameWithoutOutput, htmlReportString))
                .returns(() => {})
                .verifiable(Times.once());
            fsMock
                .setup(fsm => fsm.mkdirSync(testInputWithoutOutput.output))
                .returns(() => {})
                .verifiable(Times.never());

            scannerMock.setup(sm => sm.scan(testInputWithoutOutput.url)).returns(async () => Promise.resolve(scanResults));
            reportGeneratorMock.setup(rg => rg.generateReport(scanResults)).returns(() => htmlReportString);
            // tslint:disable-next-line: no-floating-promises
            await testSubject.runCommand(testInputWithoutOutput);
            expect(testInputWithoutOutput.output).toEqual('.');

            verifyMocks();
        });
    });

    function verifyMocks(): void {
        scannerMock.verifyAll();
        reportGeneratorMock.verifyAll();
        fsMock.verifyAll();
    }
});
