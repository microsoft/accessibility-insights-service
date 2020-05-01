// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { IMock, Mock } from 'typemoq';
import { CliEntryPoint } from './cli-entry-point';
import { FileCommandRunner } from './runner/file-command-runner';
import { URLCommandRunner } from './runner/url-command-runner';
import { ScanArguments } from './scanner/scan-arguments';

describe(CliEntryPoint, () => {
    let testSubject: CliEntryPoint;
    let containerMock: IMock<Container>;
    let urlCommandRunnerMock: IMock<URLCommandRunner>;
    let fileCommandRunnerMock: IMock<FileCommandRunner>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        urlCommandRunnerMock = Mock.ofType(URLCommandRunner);
        fileCommandRunnerMock = Mock.ofType(FileCommandRunner);

        testSubject = new CliEntryPoint(containerMock.object);
    });

    describe('runScan', () => {
        it('returns URL Command Runner', async () => {
            const testInput: ScanArguments = { url: 'https://www.bing.com', output: '/users/xyz' };
            containerMock.setup((cm) => cm.get(URLCommandRunner)).returns(() => urlCommandRunnerMock.object);
            const runCommand = jest.spyOn(urlCommandRunnerMock.object, 'runCommand').mockImplementationOnce(async () => Promise.resolve());
            await testSubject.runScan(testInput);
            expect(runCommand).toBeCalled();
        });
        it('returns File Command Runner', async () => {
            const testInput: ScanArguments = { inputFile: 'inputFile.txt', output: '/users/xyz' };
            containerMock.setup((cm) => cm.get(FileCommandRunner)).returns(() => fileCommandRunnerMock.object);
            const runCommand = jest.spyOn(fileCommandRunnerMock.object, 'runCommand').mockImplementationOnce(async () => Promise.resolve());
            await testSubject.runScan(testInput);
            expect(runCommand).toBeCalled();
        });

        it('returns null', async () => {
            const testInput: ScanArguments = { output: '/users/xyz' };
            await expect(testSubject.runScan(testInput)).rejects.toThrow(
                new Error('You should provide either url or inputFile parameter only!'),
            );
        });
    });
});
