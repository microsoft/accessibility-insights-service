// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Logger } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { TestContainerLogProperties, TestEnvironment, TestRunLogProperties } from '../common-types';
import { test } from '../test-decorator';
import { TestRunner } from './test-runner';

// tslint:disable: no-any no-unsafe-any

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

    beforeEach(() => {
        testContainerA = new TestGroupAStub();
        testContainerB = new TestGroupBStub();
        testContainerAName = testContainerA.constructor.name;
        testContainerBName = testContainerB.constructor.name;
        loggerMock = Mock.ofType();

        testRunner = new TestRunner(loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
    });

    it('override logger instance', () => {
        const newLogger = <Logger>(<unknown>{ loggerId: 'id' });
        expect(loggerMock.object).toEqual((<any>testRunner).logger);
        testRunner.setLogger(newLogger);
        expect(newLogger).toEqual((<any>testRunner).logger);
    });

    it('run all tests', async () => {
        loggerMock.setup(o => o.trackEvent('FunctionalTest', It.isAny())).verifiable(Times.exactly(5));
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            environment: 'canary',
            testContainer: testContainerAName,
            testName: 'testC',
            result: 'pass',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            environment: 'canary',
            testContainer: testContainerAName,
            testName: 'testD',
            result: 'pass',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            environment: 'canary',
            testContainer: testContainerAName,
            result: 'pass',
            logSource: 'TestContainer',
        });

        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            environment: 'canary',
            testContainer: testContainerBName,
            testName: 'testE',
            result: 'pass',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            environment: 'canary',
            testContainer: testContainerBName,
            result: 'pass',
            logSource: 'TestContainer',
        });

        await testRunner.runAll([testContainerA, testContainerB], TestEnvironment.canary, releaseId, runId);
    });

    it('run tests for the given environment only', async () => {
        loggerMock.setup(o => o.trackEvent('FunctionalTest', It.isAny())).verifiable(Times.exactly(3));
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            environment: 'canary',
            testContainer: testContainerAName,
            testName: 'testC',
            result: 'pass',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            environment: 'canary',
            testContainer: testContainerAName,
            testName: 'testD',
            result: 'pass',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            environment: 'canary',
            testContainer: testContainerAName,
            result: 'pass',
            logSource: 'TestContainer',
        });

        await testRunner.run(testContainerA, TestEnvironment.canary, releaseId, runId);
    });

    it('handle test exception', async () => {
        loggerMock.setup(o => o.trackEvent('FunctionalTest', It.isAny())).verifiable(Times.exactly(3));
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            environment: 'insider',
            testContainer: testContainerAName,
            testName: 'testA',
            result: 'fail',
            error: 'Error while invoked test A',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            environment: 'insider',
            testContainer: testContainerAName,
            testName: 'testC',
            result: 'pass',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            environment: 'insider',
            testContainer: testContainerAName,
            result: 'fail',
            logSource: 'TestContainer',
        });

        await testRunner.run(testContainerA, TestEnvironment.insider, releaseId, runId);
    });

    it('Runs test with correct context', async () => {
        const testContainerWithContext = new TestGroupWithContext();
        const testContainerName = testContainerWithContext.constructor.name;
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            environment: 'all',
            testContainer: testContainerName,
            testName: 'test',
            result: 'pass',
            logSource: 'TestRun',
        });
        setupLoggerMock({
            runId: runId,
            releaseId: releaseId,
            environment: 'all',
            testContainer: testContainerName,
            result: 'pass',
            logSource: 'TestContainer',
        });

        await testRunner.run(testContainerWithContext, TestEnvironment.all, releaseId, runId);
    });

    function setupLoggerMock(params: TestRunLogProperties | TestContainerLogProperties): void {
        loggerMock.setup(o => o.trackEvent('FunctionalTest', { ...params })).verifiable(Times.once());
    }
});
