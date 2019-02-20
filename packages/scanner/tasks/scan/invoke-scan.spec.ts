import { IMock, Mock } from 'typemoq';

import { invokeScan, ScanConfig } from './invoke-scan';
import { Scanner } from './scanner';

// tslint:disable: no-any

describe('InvokeScan', () => {
    let scannerMock: IMock<Scanner>;

    beforeEach(() => {
        scannerMock = Mock.ofType(Scanner);
    });

    it('should invoke scan with the given args', async () => {
        const argsStub: ScanConfig = { scanUrl: 'some url' };

        scannerMock
            .setup(async s => s.scan(argsStub.scanUrl))
            .returns(async () => Promise.resolve('scan results stub data' as any))
            .verifiable();

        await invokeScan(argsStub, scannerMock.object);

        scannerMock.verifyAll();
    });
});
