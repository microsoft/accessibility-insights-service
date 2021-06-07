// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Container } from 'inversify';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { CliEntryPoint } from './cli-entry-point';
import { ReportDiskWriter } from './report/report-disk-writer';
import { ReportNameGenerator } from './report/report-name-generator';
import { CrawlerCommandRunner } from './runner/crawler-command-runner';
import { UrlCommandRunner } from './runner/url-command-runner';
import { ScanArguments } from './scan-arguments';

describe(CliEntryPoint, () => {
    let testSubject: CliEntryPoint;
    let containerMock: IMock<Container>;
    let urlCommandRunnerMock: IMock<UrlCommandRunner>;
    let crawlerCommandRunnerMock: IMock<CrawlerCommandRunner>;
    let reportDiskWriterMock: IMock<ReportDiskWriter>;
    let reportNameGeneratorMock: IMock<ReportNameGenerator>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        urlCommandRunnerMock = Mock.ofType(UrlCommandRunner);
        crawlerCommandRunnerMock = Mock.ofType(CrawlerCommandRunner);
        reportDiskWriterMock = Mock.ofType(ReportDiskWriter, MockBehavior.Strict);
        reportNameGeneratorMock = Mock.ofType(ReportNameGenerator);

        testSubject = new CliEntryPoint(containerMock.object);
    });

    describe('runScan', () => {
        it('returns URL command runner', async () => {
            const testInput: ScanArguments = { url: 'https://www.bing.com', output: '/users/xyz' };
            containerMock.setup((o) => o.get(UrlCommandRunner)).returns(() => urlCommandRunnerMock.object);
            const runCommand = jest.spyOn(urlCommandRunnerMock.object, 'runCommand').mockImplementationOnce(async () => Promise.resolve());
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
