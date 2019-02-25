import { AxeResults } from 'axe-core';
import { IMock, Mock, MockBehavior } from 'typemoq';

import { ScanConfig, ScanTaskRunner } from './scan-task-runner';
import { ScanTaskSteps } from './scan-task-steps';

// tslint:disable: no-any no-object-literal-type-assertion no-unsafe-any

describe(ScanTaskRunner, () => {
    let scanTaskStepsStrictMock: IMock<ScanTaskSteps>;
    const argsStub: ScanConfig = undefined;
    let axeResultsStub: AxeResults;
    let testSubject: ScanTaskRunner;

    beforeEach(() => {
        axeResultsStub = 'stub axe results' as any;
        scanTaskStepsStrictMock = Mock.ofType(ScanTaskSteps, MockBehavior.Strict);

        testSubject = new ScanTaskRunner(argsStub, scanTaskStepsStrictMock.object);
    });

    it('should invoke all task steps', async () => {
        scanTaskStepsStrictMock
            .setup(async s => s.scanForA11yIssues())
            .returns(async () => Promise.resolve(axeResultsStub))
            .verifiable();
        scanTaskStepsStrictMock
            .setup(async s => s.storeIssues(axeResultsStub))
            .returns(async () => Promise.resolve(undefined))
            .verifiable();

        await testSubject.run();

        scanTaskStepsStrictMock.verifyAll();
    });
});
