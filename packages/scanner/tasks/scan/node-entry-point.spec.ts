import { IMock, Mock, MockBehavior } from 'typemoq';

import { NodeEntryPoint } from './node-entry-point';
import { ScanTaskRunner } from './scan-task-runner';

// tslint:disable: no-any no-object-literal-type-assertion

describe(NodeEntryPoint, () => {
    let scanTaskRunnerStrictMock: IMock<ScanTaskRunner>;
    let processStub: NodeJS.Process;
    let testSubject: NodeEntryPoint;

    beforeEach(() => {
        scanTaskRunnerStrictMock = Mock.ofType(ScanTaskRunner, MockBehavior.Strict);
        processStub = {} as NodeJS.Process;
        testSubject = new NodeEntryPoint(scanTaskRunnerStrictMock.object, processStub);
    });

    it('runs task runner', async () => {
        scanTaskRunnerStrictMock
            .setup(async s => s.run())
            .returns(async () => Promise.resolve(undefined))
            .verifiable();

        await testSubject.run();

        expect(processStub.exitCode).not.toBeDefined();
        scanTaskRunnerStrictMock.verifyAll();
    });

    it('sets process exit code on failure', async () => {
        const failureMessage = 'stub error message';
        scanTaskRunnerStrictMock.setup(async s => s.run()).returns(async () => Promise.reject(failureMessage));

        await expect(testSubject.run()).resolves.toBe(undefined);
        expect(processStub.exitCode).toBe(1);
    });
});
