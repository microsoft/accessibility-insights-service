// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { TestDefinition, TestEnvironment, TestResult } from '../common-types';
import { getDefinedTestsMetadata } from '../test-decorator';

// tslint:disable: no-any no-unsafe-any

export interface TestRunLogProperties {
    runId: string;
    releaseId: string;
    environment: string;
    testContainer: string;
    testName: string;
    result: TestResult;
    error?: string;
}

export interface TestContainerLogProperties {
    runId: string;
    releaseId: string;
    environment: string;
    testContainer: string;
    result: TestResult;
}

@injectable()
export class TestRunner {
    private logger: Logger;

    public constructor(@inject(GuidGenerator) private readonly guidGenerator: GuidGenerator) {}

    public setLogger(logger: Logger): void {
        this.logger = logger;
    }

    public async runAll(testContainers: object[], env: TestEnvironment, releaseId: string, runId?: string): Promise<void> {
        const currentRunId = runId !== undefined ? runId : this.guidGenerator.createGuid();
        await Promise.all(testContainers.map(async testContainer => this.run(testContainer, env, releaseId, currentRunId)));
    }

    public async run(testContainer: object, env: TestEnvironment, releaseId: string, runId?: string): Promise<void> {
        if (this.logger === undefined) {
            throw new Error('The logger instance is undefined. Use setLogger() to initialize the logger instance.');
        }

        const currentRunId = runId !== undefined ? runId : this.guidGenerator.createGuid();
        const definedTests = getDefinedTestsMetadata(testContainer);
        // tslint:disable-next-line: no-bitwise
        const targetedTests = definedTests.filter(definedTest => definedTest.environments & env);
        let containerPass = true;
        await Promise.all(
            targetedTests.map(async targetedTest => {
                const testPass = await this.runTest(targetedTest, env, testContainer, releaseId, currentRunId);

                containerPass = containerPass && testPass;
            }),
        );

        const testContainerName = testContainer.constructor.name;
        this.log({
            runId: currentRunId,
            releaseId: releaseId,
            environment: TestEnvironment[env],
            testContainer: testContainerName,
            result: containerPass ? 'pass' : 'fail',
        });
    }

    private async runTest(
        testDefinition: TestDefinition,
        env: TestEnvironment,
        testContainer: object,
        releaseId: string,
        runId: string,
    ): Promise<boolean> {
        try {
            await Promise.resolve(testDefinition.testImplFunc.call(testContainer));

            this.log({
                runId: runId,
                releaseId: releaseId,
                environment: TestEnvironment[env],
                testContainer: testDefinition.testContainer,
                testName: testDefinition.testName,
                result: 'pass',
            });

            return true;
        } catch (error) {
            this.log({
                runId: runId,
                releaseId: releaseId,
                environment: TestEnvironment[env],
                testContainer: testDefinition.testContainer,
                testName: testDefinition.testName,
                result: 'fail',
                error: error.message !== undefined ? error.message : error,
            });

            return false;
        }
    }

    private log(properties: TestRunLogProperties | TestContainerLogProperties): void {
        this.logger.trackEvent('FunctionalTest', {
            ...properties,
        });
    }
}
