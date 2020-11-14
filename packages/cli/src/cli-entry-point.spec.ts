// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container, interfaces } from 'inversify';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { CliEntryPoint } from './cli-entry-point';
import { ReportDiskWriter } from './report/report-disk-writer';
import { ReportNameGenerator } from './report/report-name-generator';
import { CrawlerCommandRunner } from './runner/crawler-command-runner';
import { FileCommandRunner } from './runner/file-command-runner';
import { URLCommandRunner } from './runner/url-command-runner';
import { ScanArguments } from './scanner/scan-arguments';
import { iocTypes } from './ioc-types';

describe(CliEntryPoint, () => {
    let testSubject: CliEntryPoint;
    let containerMock: IMock<Container>;
    let urlCommandRunnerMock: IMock<URLCommandRunner>;
    let fileCommandRunnerMock: IMock<FileCommandRunner>;
    let crawlerCommandRunnerMock: IMock<CrawlerCommandRunner>;
    let reportDiskWriterMock: IMock<ReportDiskWriter>;
    let reportNameGeneratorMock: IMock<ReportNameGenerator>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        urlCommandRunnerMock = Mock.ofType(URLCommandRunner);
        fileCommandRunnerMock = Mock.ofType(FileCommandRunner);
        crawlerCommandRunnerMock = Mock.ofType(CrawlerCommandRunner);
        reportDiskWriterMock = Mock.ofType(ReportDiskWriter, MockBehavior.Strict);
        reportNameGeneratorMock = Mock.ofType(ReportNameGenerator);
        containerMock
            .setup((o) => o.bind(iocTypes.RunOptions))
            .returns(() => {
                return {
                    toConstantValue: (value: unknown) => undefined as interfaces.BindingWhenOnSyntax<unknown>,
                } as interfaces.BindingToSyntax<unknown>;
            });

        testSubject = new CliEntryPoint(containerMock.object);
    });

    describe('runScan', () => {
        it('returns URL command runner', async () => {
            const testInput: ScanArguments = { url: 'https://www.bing.com', output: '/users/xyz' };
            containerMock.setup((o) => o.get(URLCommandRunner)).returns(() => urlCommandRunnerMock.object);
            const runCommand = jest.spyOn(urlCommandRunnerMock.object, 'runCommand').mockImplementationOnce(async () => Promise.resolve());
            await testSubject.runScan(testInput);
            expect(runCommand).toBeCalled();
        });

        it('returns file command runner', async () => {
            const testInput: ScanArguments = { inputFile: 'inputFile.txt', output: '/users/xyz' };
            containerMock.setup((o) => o.get(FileCommandRunner)).returns(() => fileCommandRunnerMock.object);
            const runCommand = jest.spyOn(fileCommandRunnerMock.object, 'runCommand').mockImplementationOnce(async () => Promise.resolve());
            await testSubject.runScan(testInput);
            expect(runCommand).toBeCalled();
        });

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

            reportDiskWriterMock.setup((o) => o.writeToDirectory(testInput.output, logName, 'log', error));

            containerMock.setup((o) => o.get(ReportDiskWriter)).returns(() => reportDiskWriterMock.object);
            containerMock.setup((o) => o.get(ReportNameGenerator)).returns(() => reportNameGeneratorMock.object);
            const runCommand = jest
                .spyOn(urlCommandRunnerMock.object, 'runCommand')
                .mockImplementationOnce(async () => Promise.reject(new Error(error)));

            await expect(runCommand).rejects.toThrowError(error);
        });
    });
});
