// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { inject, injectable, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import { TestContainerLogProperties, TestDefinition, TestEnvironment, TestRunLogProperties } from '../common-types';
import { getDefinedTestsMetadata } from '../test-decorator';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type TestRunMetadata = {
    environment: TestEnvironment;
    releaseId: string;
    runId: string;
    scenarioName: string;
    scanId?: string;
};

@injectable()
export class TestRunner {
    public constructor(@optional() @inject(GlobalLogger) private logger: GlobalLogger) {}

    public setLogger(logger: GlobalLogger): void {
        this.logger = logger;
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    public async runAll(testContainers: object[], metadata: TestRunMetadata): Promise<void> {
        await Promise.all(testContainers.map(async (testContainer) => this.run(testContainer, metadata)));
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    public async run(testContainer: object, metadata: TestRunMetadata): Promise<void> {
        if (this.logger === undefined) {
            throw new Error('The logger instance is undefined. Use setLogger() to initialize the logger instance.');
        }

        const definedTests = getDefinedTestsMetadata(testContainer);
        // eslint-disable-next-line no-bitwise
        const targetedTests = definedTests.filter((definedTest) => definedTest.environments & metadata.environment);
        let containerPass = true;
        await Promise.all(
            targetedTests.map(async (targetedTest) => {
                const testPass = await this.runTest(targetedTest, testContainer, metadata);

                containerPass = containerPass && testPass;
            }),
        );

        const testContainerName = testContainer.constructor.name;
        this.log({
            ...metadata,
            logSource: 'TestContainer',
            environment: TestEnvironment[metadata.environment],
            testContainer: testContainerName,
            result: containerPass ? 'pass' : 'fail',
        });
    }

    private async runTest(
        testDefinition: TestDefinition,
        // eslint-disable-next-line @typescript-eslint/ban-types
        testContainer: object,
        metadata: TestRunMetadata,
    ): Promise<boolean> {
        try {
            await Promise.resolve(testDefinition.testImplFunc.call(testContainer));

            this.log({
                ...metadata,
                logSource: 'TestRun',
                environment: TestEnvironment[metadata.environment],
                testContainer: testDefinition.testContainer,
                testName: testDefinition.testName,
                result: 'pass',
            });

            return true;
        } catch (error) {
            this.log({
                ...metadata,
                logSource: 'TestRun',
                environment: TestEnvironment[metadata.environment],
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
