// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator } from 'common';
import { Logger, LogLevel } from 'logger';
import { OnDemandPageScanRunResultProvider, WebApiErrorCode } from 'service-library';
import { isNullOrUndefined } from 'util';
import { A11yServiceClient } from 'web-api-client';

import { TestEnvironment } from '../common-types';
import { SerializableResponse, TestContextData } from '../test-group-data';

export abstract class FunctionalTestGroup {
    protected testContextData: TestContextData;
    private readonly testCaseMap: { [env: string]: (() => Promise<boolean>)[] } = {};

    constructor(
        protected readonly a11yServiceClient: A11yServiceClient,
        protected readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        protected readonly logger: Logger,
        protected readonly guidGenerator: GuidGenerator,
    ) {}

    public async run(testContextData: TestContextData, env = TestEnvironment.canary): Promise<TestContextData> {
        this.initialize(testContextData);
        this.registerTestCases();

        const groupTestResults = await Promise.all(this.getTestsForEnvironment(env).map(testCase => testCase()));
        const groupTestResult = groupTestResults.every(result => result);

        if (groupTestResult === true) {
            this.onTestGroupSucceed();
        } else {
            this.onTestGroupFailed();
        }

        this.cleanup();

        return this.testContextData;
    }

    protected abstract registerTestCases(): void;

    protected registerTestCaseForEnvironment(test: () => Promise<boolean>, env = TestEnvironment.canary): void {
        this.getTestsForEnvironment(env).push(test);
    }

    protected registerTestCaseForAllEnvironment(test: () => Promise<boolean>): void {
        Object.values(TestEnvironment).forEach((env: TestEnvironment) => {
            this.registerTestCaseForEnvironment(test, env);
        });
    }

    protected initialize(testContextData: TestContextData): void {
        this.testContextData = testContextData;
        Object.values(TestEnvironment).forEach((env: TestEnvironment) => {
            this.testCaseMap[env] = [];
        });
    }

    protected onTestGroupSucceed(): void {
        this.log('[E2E] Test Group Passed');
    }

    protected onTestGroupFailed(): void {
        this.log('[E2E] Test Group Failed');
    }

    // tslint:disable-next-line: no-empty
    protected cleanup(): void {}

    protected ensureSuccessStatusCode(response: SerializableResponse, message?: string): boolean {
        if (response.statusCode < 200 || response.statusCode >= 300) {
            this.log(`[E2E] Scan request failed`, LogLevel.error, {
                requestResponse: JSON.stringify(response),
                message,
            });

            return false;
        }

        return true;
    }

    protected expectErrorResponse(webApiErrorCode: WebApiErrorCode, response: SerializableResponse, message?: string): boolean {
        if (webApiErrorCode.statusCode !== response.statusCode) {
            this.log(`[E2E] Scan response not as expected`, LogLevel.error, {
                response: JSON.stringify(response),
                message,
            });

            return false;
        }

        return true;
    }

    protected expectEqual<T>(expected: T, actual: T, testInfo?: string): boolean {
        return this.logValidationErrorIf(expected !== actual, testInfo);
    }

    protected expectTrue<T>(actual: boolean, testInfo?: string): boolean {
        return this.logValidationErrorIf(actual !== true, testInfo);
    }

    protected expectFalse<T>(actual: boolean, testInfo?: string): boolean {
        return this.logValidationErrorIf(actual !== false, testInfo);
    }

    protected expectToBeDefined<T>(actual: T, testInfo?: string): boolean {
        return this.logValidationErrorIf(isNullOrUndefined(actual), testInfo);
    }

    protected expectToBeNotDefined<T>(actual: T, testInfo?: string): boolean {
        return this.logValidationErrorIf(!isNullOrUndefined(actual), testInfo);
    }

    private getTestsForEnvironment(env: TestEnvironment): (() => Promise<boolean>)[] {
        return this.testCaseMap[env];
    }

    private logValidationErrorIf(evaluation: boolean, testInfo: string): boolean {
        if (evaluation === true) {
            this.log(`[E2E] Validation failed`, LogLevel.error, { testInfo });
        }

        return evaluation;
    }

    private log(message: string, logType: LogLevel = LogLevel.info, properties?: { [name: string]: string }): void {
        this.logger.log(message, logType, {
            ...properties,
        });
    }
}
