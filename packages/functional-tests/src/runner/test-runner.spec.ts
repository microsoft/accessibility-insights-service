// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Logger, LogLevel } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { TestRunner } from './test-runner';

// tslint:disable: no-unsafe-any

class TestGroupStub {
    @test(TestEnvironment.insider)
    public async testA(): Promise<void> {
        throw new Error('async error Test A');
    }

    public testB(): void {
        console.log('Test B');
    }

    @test(TestEnvironment.all)
    public testC(): void {
        console.log('Test C');
    }

    @test(TestEnvironment.canary)
    public testD(): void {
        console.log('Test D');
    }
}

describe(TestRunner, () => {
    let testContainer: TestGroupStub;
    let testContainerName: string;
    let testRunner: TestRunner;
    let loggerMock: IMock<Logger>;

    beforeEach(() => {
        testContainer = new TestGroupStub();
        testContainerName = testContainer.constructor.name;
        loggerMock = Mock.ofType();
        testRunner = new TestRunner(loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
    });

    it('run tests for the given environment only', async () => {
        loggerMock.setup(o => o.log(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.exactly(3));
        loggerMock
            .setup(o =>
                o.log(`[E2E] Test ${testContainerName}.testC pass`, LogLevel.info, {
                    source: 'e2e',
                    testContainer: testContainerName,
                    testName: 'testC',
                    environment: 'canary',
                    result: 'pass',
                }),
            )
            .verifiable(Times.once());
        loggerMock
            .setup(o =>
                o.log(`[E2E] Test ${testContainerName}.testD pass`, LogLevel.info, {
                    source: 'e2e',
                    testContainer: testContainerName,
                    testName: 'testD',
                    environment: 'canary',
                    result: 'pass',
                }),
            )
            .verifiable(Times.once());
        loggerMock
            .setup(o =>
                o.log(`[E2E] Tests ${testContainerName} completed`, LogLevel.info, {
                    source: 'e2e',
                    testContainer: testContainerName,
                    environment: 'canary',
                }),
            )
            .verifiable(Times.once());

        await testRunner.run(testContainer, TestEnvironment.canary);
    });

    it('handle test exception', async () => {
        loggerMock.setup(o => o.log(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.exactly(3));
        loggerMock
            .setup(o =>
                o.log(`[E2E] Test ${testContainerName}.testA fail`, LogLevel.error, {
                    source: 'e2e',
                    testContainer: testContainerName,
                    testName: 'testA',
                    environment: 'insider',
                    result: 'fail',
                    error: 'async error Test A',
                }),
            )
            .verifiable(Times.once());
        loggerMock
            .setup(o =>
                o.log(`[E2E] Test ${testContainerName}.testC pass`, LogLevel.info, {
                    source: 'e2e',
                    testContainer: testContainerName,
                    testName: 'testC',
                    environment: 'insider',
                    result: 'pass',
                }),
            )
            .verifiable(Times.once());
        loggerMock
            .setup(o =>
                o.log(`[E2E] Tests ${testContainerName} completed`, LogLevel.info, {
                    source: 'e2e',
                    testContainer: testContainerName,
                    environment: 'insider',
                }),
            )
            .verifiable(Times.once());

        await testRunner.run(testContainer, TestEnvironment.insider);
    });
});
