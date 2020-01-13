// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { IMock, Mock } from 'typemoq';
import { CliEntryPoint } from './cli-entry-point';
import { CommandRunner } from './command-runner';
import { ScanArguments } from './scanner/scan-arguments';

describe(CliEntryPoint, () => {
    let testSubject: CliEntryPoint;
    let containerMock: IMock<Container>;
    let commandRunnerMock: IMock<CommandRunner>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        commandRunnerMock = Mock.ofType(CommandRunner);

        testSubject = new CliEntryPoint(containerMock.object);
    });

    describe('runScan', () => {
        it('returns Command Runner', async () => {
            const testInput: ScanArguments = { url: 'https://www.bing.com', output: '/users/xyz' };
            containerMock.setup(cm => cm.get(CommandRunner)).returns(() => commandRunnerMock.object);
            const runCommand = jest.spyOn(commandRunnerMock.object, 'runCommand').mockImplementationOnce(async () => Promise.resolve());
            // tslint:disable-next-line: no-floating-promises
            await testSubject.runScan(testInput);
            expect(runCommand).toBeCalled();
        });
    });
});
