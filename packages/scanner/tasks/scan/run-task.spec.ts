import { IMock, Mock } from 'typemoq';

import { runTask, ScanConfig } from './run-task';
import { Scanner } from './scanner';

// tslint:disable: no-any no-object-literal-type-assertion

describe('RunTask', () => {
    let scannerMock: IMock<Scanner>;
    let processStub: NodeJS.Process;

    beforeEach(() => {
        scannerMock = Mock.ofType(Scanner);
        processStub = {} as NodeJS.Process;
    });

    it('should invoke scan with the given args', async () => {
        const argsStub: ScanConfig = { scanUrl: 'some url' };

        scannerMock
            .setup(async s => s.scan(argsStub.scanUrl))
            .returns(async () => Promise.resolve('scan results stub data' as any))
            .verifiable();

        await runTask(argsStub, scannerMock.object, processStub);

        expect(processStub.exitCode).not.toBeDefined();
        scannerMock.verifyAll();
    });

    it('should set exit code on failure', async () => {
        const argsStub: ScanConfig = { scanUrl: 'some url' };
        const failingReason: any = 'scan failed';
        scannerMock
            .setup(async s => s.scan(argsStub.scanUrl))
            .returns(async () => Promise.reject(failingReason))
            .verifiable();

        await expect(runTask(argsStub, scannerMock.object, processStub)).resolves.toEqual(undefined);

        expect(processStub.exitCode).toBe(1);
        scannerMock.verifyAll();
    });
});
