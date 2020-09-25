// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { inject, injectable, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import { TestContainerLogProperties, TestDefinition, TestEnvironment, TestRunLogProperties } from '../common-types';
import { getDefinedTestsMetadata } from '../test-decorator';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class TestRunner {
    public constructor(@optional() @inject(GlobalLogger) private logger: GlobalLogger) {}

    public setLogger(logger: GlobalLogger): void {
        this.logger = logger;
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    public async runAll(testContainers: object[], env: TestEnvironment, releaseId: string, runId: string): Promise<void> {
        await Promise.all(testContainers.map(async (testContainer) => this.run(testContainer, env, releaseId, runId)));
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    public async run(testContainer: object, env: TestEnvironment, releaseId: string, runId: string): Promise<void> {
        if (this.logger === undefined) {
            throw new Error('The logger instance is undefined. Use setLogger() to initialize the logger instance.');
        }

        const definedTests = getDefinedTestsMetadata(testContainer);
        // eslint-disable-next-line no-bitwise
        const targetedTests = definedTests.filter((definedTest) => definedTest.environments & env);
        let containerPass = true;
        await Promise.all(
            targetedTests.map(async (targetedTest) => {
                const testPass = await this.runTest(targetedTest, env, testContainer, releaseId, runId);

                containerPass = containerPass && testPass;
            }),
        );

        const testContainerName = testContainer.constructor.name;
        this.log({
            logSource: 'TestContainer',
            runId: runId,
            releaseId: releaseId,
            environment: TestEnvironment[env],
            testContainer: testContainerName,
            result: containerPass ? 'pass' : 'fail',
        });
    }

    private async runTest(
        testDefinition: TestDefinition,
        env: TestEnvironment,
        // eslint-disable-next-line @typescript-eslint/ban-types
        testContainer: object,
        releaseId: string,
        runId: string,
    ): Promise<boolean> {
        try {
            await Promise.resolve(testDefinition.testImplFunc.call(testContainer));

            this.log({
                logSource: 'TestRun',
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
                logSource: 'TestRun',
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
