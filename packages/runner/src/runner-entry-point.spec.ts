import 'reflect-metadata';

import { Container } from 'inversify';
import { IMock, Mock } from 'typemoq';
import { RunnerEntryPoint } from './runner-entry-point';
import { Runner } from './runner/runner';

describe(RunnerEntryPoint, () => {
    class TestRunnerEntryPoint extends RunnerEntryPoint {
        public async invokeRunCustomAction(container: Container): Promise<void> {
            await this.runCustomAction(container);
        }
    }

    let testSubject: TestRunnerEntryPoint;
    let containerMock: IMock<Container>;
    let runnerMock: IMock<Runner>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        runnerMock = Mock.ofType(Runner);

        testSubject = new TestRunnerEntryPoint(containerMock.object);

        containerMock.setup(c => c.get(Runner)).returns(() => runnerMock.object);
    });

    it('invokes runner.run', async () => {
        runnerMock
            .setup(async r => r.run())
            .returns(async () => Promise.resolve())
            .verifiable();

        await expect(testSubject.invokeRunCustomAction(containerMock.object)).resolves.toBeUndefined();

        runnerMock.verifyAll();
    });
});
