// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { GuidGenerator } from 'common';
import { Logger, LogLevel } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { TestRunner } from './test-runner';

// tslint:disable: no-unsafe-any

class TestGroupWithContext {
    public var1: string = 'some value';

    @test(TestEnvironment.all)
    public async test(): Promise<void> {
        expect(this.var1).toBeDefined();
        expect(this.var1).toEqual('some value');
    }
}

class TestGroupAStub {
    @test(TestEnvironment.insider)
    public async testA(): Promise<void> {
        throw new Error('Error while invoked test A');
    }

    public testB(): void {
        console.log('Invoked test B');
    }

    @test(TestEnvironment.all)
    public testC(): void {
        console.log('Invoked test C');
    }

    @test(TestEnvironment.canary)
    public testD(): void {
        console.log('Invoked test D');
    }
}

class TestGroupBStub {
    @test(TestEnvironment.all)
    public testE(): void {
        console.log('Invoked test E');
    }
}

describe(TestRunner, () => {
    const runId = 'run id';
    const releaseId = 'release id';
    let testContainerA: TestGroupAStub;
    let testContainerB: TestGroupBStub;
    let testContainerAName: string;
    let testContainerBName: string;
    let testRunner: TestRunner;
    let loggerMock: IMock<Logger>;
    let guidGeneratorMock: IMock<GuidGenerator>;

    beforeEach(() => {
        testContainerA = new TestGroupAStub();
        testContainerB = new TestGroupBStub();
        testContainerAName = testContainerA.constructor.name;
        testContainerBName = testContainerB.constructor.name;
        loggerMock = Mock.ofType();

        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        guidGeneratorMock.setup(g => g.createGuid()).returns(() => runId);

        testRunner = new TestRunner(guidGeneratorMock.object);
        testRunner.setLogger(loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
    });

    it('run all tests', async () => {
        loggerMock.setup(o => o.trackEvent('FunctionalTest', It.isAny())).verifiable(Times.exactly(5));
        loggerMock
            .setup(o =>
                o.trackEvent('FunctionalTest', {
                    runId: runId,
                    releaseId: releaseId,
                    environment: 'canary',
                    testContainer: testContainerAName,
                    testName: 'testC',
                    result: 'pass',
                }),
            )
            .verifiable(Times.once());
        loggerMock
            .setup(o =>
                o.trackEvent('FunctionalTest', {
                    runId: runId,
                    releaseId: releaseId,
                    environment: 'canary',
                    testContainer: testContainerAName,
                    testName: 'testD',
                    result: 'pass',
                }),
            )
            .verifiable(Times.once());
        loggerMock
            .setup(o =>
                o.trackEvent('FunctionalTest', {
                    runId: runId,
                    releaseId: releaseId,
                    environment: 'canary',
                    testContainer: testContainerAName,
                    result: 'pass',
                }),
            )
            .verifiable(Times.once());

        loggerMock
            .setup(o =>
                o.trackEvent('FunctionalTest', {
                    runId: runId,
                    releaseId: releaseId,
                    environment: 'canary',
                    testContainer: testContainerBName,
                    testName: 'testE',
                    result: 'pass',
                }),
            )
            .verifiable(Times.once());
        loggerMock
            .setup(o =>
                o.trackEvent('FunctionalTest', {
                    runId: runId,
                    releaseId: releaseId,
                    environment: 'canary',
                    testContainer: testContainerBName,
                    result: 'pass',
                }),
            )
            .verifiable(Times.once());

        await testRunner.runAll([testContainerA, testContainerB], TestEnvironment.canary, releaseId);
    });

    it('run tests for the given environment only', async () => {
        loggerMock.setup(o => o.trackEvent('FunctionalTest', It.isAny())).verifiable(Times.exactly(3));
        loggerMock
            .setup(o =>
                o.trackEvent('FunctionalTest', {
                    runId: runId,
                    releaseId: releaseId,
                    environment: 'canary',
                    testContainer: testContainerAName,
                    testName: 'testC',
                    result: 'pass',
                }),
            )
            .verifiable(Times.once());
        loggerMock
            .setup(o =>
                o.trackEvent('FunctionalTest', {
                    runId: runId,
                    releaseId: releaseId,
                    environment: 'canary',
                    testContainer: testContainerAName,
                    testName: 'testD',
                    result: 'pass',
                }),
            )
            .verifiable(Times.once());
        loggerMock
            .setup(o =>
                o.trackEvent('FunctionalTest', {
                    runId: runId,
                    releaseId: releaseId,
                    environment: 'canary',
                    testContainer: testContainerAName,
                    result: 'pass',
                }),
            )
            .verifiable(Times.once());

        await testRunner.run(testContainerA, TestEnvironment.canary, releaseId);
    });

    it('handle test exception', async () => {
        loggerMock.setup(o => o.trackEvent('FunctionalTest', It.isAny())).verifiable(Times.exactly(3));
        loggerMock
            .setup(o =>
                o.trackEvent('FunctionalTest', {
                    runId: runId,
                    releaseId: releaseId,
                    environment: 'insider',
                    testContainer: testContainerAName,
                    testName: 'testA',
                    result: 'fail',
                    error: 'Error while invoked test A',
                }),
            )
            .verifiable(Times.once());
        loggerMock
            .setup(o =>
                o.trackEvent('FunctionalTest', {
                    runId: runId,
                    releaseId: releaseId,
                    environment: 'insider',
                    testContainer: testContainerAName,
                    testName: 'testC',
                    result: 'pass',
                }),
            )
            .verifiable(Times.once());
        loggerMock
            .setup(o =>
                o.trackEvent('FunctionalTest', {
                    runId: runId,
                    releaseId: releaseId,
                    environment: 'insider',
                    testContainer: testContainerAName,
                    result: 'fail',
                }),
            )
            .verifiable(Times.once());

        await testRunner.run(testContainerA, TestEnvironment.insider, releaseId);
    });

    it('Runs test with correct context', async () => {
        const testContainerWithContext: TestGroupWithContext = new TestGroupWithContext();
        const testContainerName = testContainerWithContext.constructor.name;
        loggerMock
            .setup(o =>
                o.trackEvent('FunctionalTest', {
                    runId: runId,
                    releaseId: releaseId,
                    environment: 'all',
                    testContainer: testContainerName,
                    testName: 'test',
                    result: 'pass',
                }),
            )
            .verifiable(Times.once());
        loggerMock
            .setup(o =>
                o.trackEvent('FunctionalTest', {
                    runId: runId,
                    releaseId: releaseId,
                    environment: 'all',
                    testContainer: testContainerName,
                    result: 'pass',
                }),
            )
            .verifiable(Times.once());

        await testRunner.run(testContainerWithContext, TestEnvironment.all, releaseId);
    });
});
