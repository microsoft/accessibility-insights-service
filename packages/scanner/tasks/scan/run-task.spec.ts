import { IMock, It, Mock, Times } from 'typemoq';

import { AxeResults } from 'axe-core';
import { runTask, ScanConfig } from './run-task';
import { TaskSteps } from './task-steps';

// tslint:disable: no-any no-object-literal-type-assertion no-unsafe-any

describe('RunTask', () => {
    let taskStepsMock: IMock<TaskSteps>;
    let processStub: NodeJS.Process;
    const argsStub: ScanConfig = undefined;
    let axeResultsStub: AxeResults;

    beforeEach(() => {
        axeResultsStub = 'stub axe results' as any;
        taskStepsMock = Mock.ofType(TaskSteps);
        processStub = {} as NodeJS.Process;
    });

    it('should invoke all task steps', async () => {
        taskStepsMock.setup(async t => t.scanForA11yIssues()).returns(async () => Promise.resolve(axeResultsStub));
        taskStepsMock.setup(async t => t.storeIssues(axeResultsStub)).returns(async () => Promise.resolve(undefined));
        await runTask(argsStub, taskStepsMock.object, processStub);

        expect(processStub.exitCode).not.toBeDefined();
        taskStepsMock.verifyAll();
    });

    it('should set exit code on failure', async () => {
        const failureMessage = 'stub error message';
        taskStepsMock.setup(async t => t.scanForA11yIssues()).returns(async () => Promise.reject(failureMessage));

        await expect(runTask(argsStub, taskStepsMock.object, processStub)).resolves.toEqual(undefined);
        taskStepsMock.verify(async t => t.storeIssues(It.isAny()), Times.never());
        expect(processStub.exitCode).toBe(1);
    });
});
