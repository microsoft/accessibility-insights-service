import { AxeResults } from 'axe-core';
import { CosmosClientWrapper } from 'azure-client';
import { IMock, Mock } from 'typemoq';

import { ResultConverter } from './result-converter';
import { ScanResult } from './scan-result';
import { ScanConfig } from './scan-task-runner';
import { ScanTaskSteps } from './scan-task-steps';
import { Scanner } from './scanner';

// tslint:disable: no-unsafe-any no-any

describe(ScanTaskSteps, () => {
    let testSubject: ScanTaskSteps;
    let scannerMock: IMock<Scanner>;
    let cosmosClientWrapperMock: IMock<CosmosClientWrapper>;
    let resultConverterMock: IMock<ResultConverter>;
    const scanConfigStub: ScanConfig = {
        scanUrl: 'some url',
        baseUrl: 'base url',
        id: 'some - id',
        name: 'stub name',
        serviceTreeId: 'stub service id',
    };

    beforeEach(() => {
        scannerMock = Mock.ofType(Scanner);
        cosmosClientWrapperMock = Mock.ofType(CosmosClientWrapper);
        resultConverterMock = Mock.ofType(ResultConverter);
        testSubject = new ScanTaskSteps(scanConfigStub, scannerMock.object, cosmosClientWrapperMock.object, resultConverterMock.object);
    });

    it('should invoke scan', async () => {
        scannerMock
            .setup(async s => s.scan(scanConfigStub.scanUrl))
            .returns(async () => Promise.resolve('scan results stub data' as any))
            .verifiable();

        await testSubject.scanForA11yIssues();

        scannerMock.verifyAll();
    });

    it('should store converted axe results', async () => {
        const axeResultsStub: AxeResults = 'stub axe results' as any;
        const convertedResultsStub: ScanResult[] = 'converted stub axe results' as any;

        resultConverterMock.setup(r => r.convert(axeResultsStub, scanConfigStub)).returns(() => convertedResultsStub);

        cosmosClientWrapperMock
            .setup(async c => c.upsertItems('scanner', 'a11yIssues', convertedResultsStub))
            .returns(async () => Promise.resolve(undefined))
            .verifiable();

        await testSubject.storeIssues(axeResultsStub);

        cosmosClientWrapperMock.verifyAll();
    });
});
