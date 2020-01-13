// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import * as fs from 'fs';
import { IMock, Mock } from 'typemoq';
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
    // tslint:disable-next-line: no-http-string
    const testUrl = 'http://www.bing.com';
    const htmlReportString = 'html report';
    beforeEach(() => {
        scannerMock = Mock.ofType<AIScanner>();
        reportGeneratorMock = Mock.ofType<ReportGenerator>();
        scanResults = {
            // tslint:disable-next-line: no-object-literal-type-assertion
            results: { url: testUrl } as AxeResults,
            pageTitle: 'page title',
            browserSpec: 'browser version',
        };
        testSubject = new CommandRunner(scannerMock.object, reportGeneratorMock.object);
    });

    describe('scan with output parameter specified', () => {
        it('output directory exists', async () => {
            const existsSync = jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => true);
            const writeFile = jest.spyOn(fs, 'writeFile').mockImplementationOnce(() => {});
            const mkdirSync = jest.spyOn(fs, 'mkdirSync').mockImplementationOnce(() => {});
            const testInput: ScanArguments = { url: testUrl, output: '/users/xyz' };
            scannerMock.setup(sm => sm.scan(testInput.url)).returns(async () => Promise.resolve(scanResults));
            reportGeneratorMock.setup(rg => rg.generateReport(scanResults)).returns(() => htmlReportString);
            // tslint:disable-next-line: no-floating-promises
            await testSubject.runCommand(testInput);
            expect(existsSync).toBeCalled();
            expect(writeFile).toBeCalled();
            expect(mkdirSync).not.toBeCalled();
        });

        it('output directory does not exists', async () => {
            const existsSync = jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => false);
            const writeFile = jest.spyOn(fs, 'writeFile').mockImplementationOnce(() => {});
            const mkdirSync = jest.spyOn(fs, 'mkdirSync').mockImplementationOnce(() => {});
            const testInput: ScanArguments = { url: testUrl, output: '/users/xyz' };
            scannerMock.setup(sm => sm.scan(testInput.url)).returns(async () => Promise.resolve(scanResults));
            reportGeneratorMock.setup(rg => rg.generateReport(scanResults)).returns(() => htmlReportString);
            // tslint:disable-next-line: no-floating-promises
            await testSubject.runCommand(testInput);
            expect(existsSync).toBeCalled();
            expect(writeFile).toBeCalled();
            expect(mkdirSync).toBeCalled();
        });
    });
    describe('scan without output parameter specified', () => {
        it('scan url', async () => {
            const existsSync = jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => true);
            const mkdirSync = jest.spyOn(fs, 'mkdirSync').mockImplementationOnce(() => {});
            const writeFile = jest.spyOn(fs, 'writeFile').mockImplementationOnce(() => {});

            const testInput: ScanArguments = { url: testUrl };
            scannerMock.setup(sm => sm.scan(testInput.url)).returns(async () => Promise.resolve(scanResults));
            reportGeneratorMock.setup(rg => rg.generateReport(scanResults)).returns(() => htmlReportString);
            // tslint:disable-next-line: no-floating-promises
            await testSubject.runCommand(testInput);
            expect(existsSync).toBeCalled();
            expect(writeFile).toBeCalled();
            expect(mkdirSync).not.toBeCalled();
            expect(testInput.output).toEqual('.');
        });
    });
});
