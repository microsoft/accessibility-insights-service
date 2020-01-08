// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { inject } from 'inversify';
import { Logger, LogLevel } from 'logger';
import { LogSource, TestDefinition, TestEnvironment, TestResult } from '../common-types';
import { getDefinedTestsMetadata } from '../test-decorator';

// tslint:disable: no-any no-unsafe-any

export interface TestRunLogProperties {
    source: LogSource;
    testContainer: string;
    testName: string;
    environment: string;
    result: TestResult;
    error?: string;
}

export interface TestContainerLogProperties {
    source: LogSource;
    testContainer: string;
    environment: string;
    result: TestResult;
}

export class TestRunner {
    public constructor(@inject(Logger) private readonly logger: Logger) {}

    public async run(testContainer: object, env: TestEnvironment): Promise<void> {
        const definedTests = getDefinedTestsMetadata(testContainer);
        // tslint:disable-next-line: no-bitwise
        const targetedTests = definedTests.filter(definedTest => definedTest.environments & env);
        let containerPass = true;
        await Promise.all(
            targetedTests.map(async targetedTest => {
                const testPass = await this.runTest(targetedTest, env);
                containerPass = containerPass && testPass;
            }),
        );

        const testContainerName = testContainer.constructor.name;
        this.log(`[E2E] Test container ${testContainerName} ${containerPass ? 'pass' : 'fail'}`, LogLevel.info, {
            source: 'e2e',
            testContainer: testContainerName,
            environment: TestEnvironment[env],
            result: containerPass ? 'pass' : 'fail',
        });
    }

    private async runTest(testDefinition: TestDefinition, env: TestEnvironment): Promise<boolean> {
        try {
            await Promise.resolve(testDefinition.testImplFunc());

            this.log(`[E2E] Test ${testDefinition.testContainer}.${testDefinition.testName} pass`, LogLevel.info, {
                source: 'e2e',
                testContainer: testDefinition.testContainer,
                testName: testDefinition.testName,
                environment: TestEnvironment[env],
                result: 'pass',
            });

            return true;
        } catch (error) {
            this.log(`[E2E] Test ${testDefinition.testContainer}.${testDefinition.testName} fail`, LogLevel.error, {
                source: 'e2e',
                testContainer: testDefinition.testContainer,
                testName: testDefinition.testName,
                environment: TestEnvironment[env],
                result: 'fail',
                error: error.message !== undefined ? error.message : error,
            });

            return false;
        }
    }

    private log(message: string, logLevel: LogLevel, properties: TestRunLogProperties | TestContainerLogProperties): void {
        this.logger.log(message, logLevel, {
            ...properties,
        });
    }
}
