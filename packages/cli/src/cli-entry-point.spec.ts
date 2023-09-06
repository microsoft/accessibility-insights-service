// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Container } from 'inversify';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { CliEntryPoint } from './cli-entry-point';
import { ReportNameGenerator } from './report/report-name-generator';
import { CrawlerCommandRunner } from './runner/crawler-command-runner';
import { ScanArguments } from './scan-arguments';
import { OutputFileWriter } from './files/output-file-writer';

describe(CliEntryPoint, () => {
    let testSubject: CliEntryPoint;
    let containerMock: IMock<Container>;
    let crawlerCommandRunnerMock: IMock<CrawlerCommandRunner>;
    let outputFileWriterMock: IMock<OutputFileWriter>;
    let reportNameGeneratorMock: IMock<ReportNameGenerator>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        crawlerCommandRunnerMock = Mock.ofType(CrawlerCommandRunner);
        outputFileWriterMock = Mock.ofType(OutputFileWriter, MockBehavior.Strict);
        reportNameGeneratorMock = Mock.ofType(ReportNameGenerator);

        testSubject = new CliEntryPoint(containerMock.object);
    });

    describe('runScan', () => {
        it('returns crawler command runner', async () => {
            const testInput: ScanArguments = { crawl: true, url: 'https://www.bing.com', output: '/users/xyz' };
            containerMock.setup((o) => o.get(CrawlerCommandRunner)).returns(() => crawlerCommandRunnerMock.object);
            const runCommand = jest
                .spyOn(crawlerCommandRunnerMock.object, 'runCommand')
                .mockImplementationOnce(async () => Promise.resolve());
            await testSubject.runScan(testInput);
            expect(runCommand).toBeCalled();
        });

        it('throw exception while running command', async () => {
            const testInput: ScanArguments = { url: 'https://www.bing.com', output: '/users/xyz' };
            const theBase = 'ai-cli-errors';
            const theDate = new Date();
            const logName = 'log name';

            const error = 'You should provide either url or inputFile parameter only.';

            reportNameGeneratorMock
                .setup((o) => o.generateName(theBase, theDate))
                .returns(() => logName)
                .verifiable(Times.once());

            outputFileWriterMock.setup((o) => o.writeToDirectory(testInput.output, logName, 'log', error));

            containerMock.setup((o) => o.get(OutputFileWriter)).returns(() => outputFileWriterMock.object);
            containerMock.setup((o) => o.get(ReportNameGenerator)).returns(() => reportNameGeneratorMock.object);
            const runCommand = jest
                .spyOn(crawlerCommandRunnerMock.object, 'runCommand')
                .mockImplementationOnce(async () => Promise.reject(new Error(error)));

            await expect(runCommand).rejects.toThrowError(error);
        });
    });
});
