// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosContainerClient } from 'azure-services';
import { GuidGenerator } from 'common';
import { Logger, LogLevel } from 'logger';
import { WebApiErrorCode } from 'service-library';
import { isNullOrUndefined } from 'util';
import { A11yServiceClient } from 'web-api-client';

import { SerializableResponse, TestContextData } from '../test-group-data';

export abstract class FunctionalTestGroup {
    protected testContextData: TestContextData;
    private readonly testCases: (() => Promise<void>)[] = [];

    constructor(
        protected readonly a11yServiceClient: A11yServiceClient,
        protected readonly cosmosContainerClient: CosmosContainerClient,
        protected readonly logger: Logger,
        protected readonly guidGenerator: GuidGenerator,
    ) {}

    public async run(testContextData: TestContextData): Promise<TestContextData> {
        this.initialize(testContextData);
        this.registerTestCases();
        this.testCases.forEach(async test => {
            await test();
        });
        this.cleanup();

        return this.testContextData;
    }

    protected abstract registerTestCases(): void;

    protected registerTestCase(test: () => Promise<void>): void {
        this.testCases.push(test);
    }

    protected initialize(testContextData: TestContextData): void {
        this.testContextData = testContextData;
    }

    // tslint:disable-next-line: no-empty
    protected cleanup(): void {}

    protected ensureSuccessStatusCode(response: SerializableResponse, message?: string): void {
        if (response.statusCode < 200 || response.statusCode >= 300) {
            this.log(`[E2E] Scan request failed`, LogLevel.error, {
                requestResponse: JSON.stringify(response),
                message,
            });
        }
    }

    protected expectErrorResponse(webApiErrorCode: WebApiErrorCode, response: SerializableResponse, message?: string): void {
        if (webApiErrorCode.statusCode !== response.statusCode) {
            this.log(`[E2E] Scan response not as expected`, LogLevel.error, {
                response: JSON.stringify(response),
                message,
            });
        }
    }

    protected expectEqual<T>(expected: T, actual: T, message?: string): void {
        if (expected !== actual) {
            this.log(`[E2E] Validation failed`, LogLevel.error, { message });
        }
    }

    protected expectTrue<T>(actual: boolean, message?: string): void {
        if (actual !== true) {
            this.log(`[E2E] Validation failed`, LogLevel.error, { message });
        }
    }

    protected expectFalse<T>(actual: boolean, message?: string): void {
        if (actual !== false) {
            this.log(`[E2E] Validation failed`, LogLevel.error, { message });
        }
    }

    protected expectToBeDefined<T>(actual: T, message?: string): void {
        if (isNullOrUndefined(actual)) {
            this.log(`[E2E] Validation failed`, LogLevel.error, { message });
        }
    }

    protected expectToBeNotDefined<T>(actual: T, message?: string): void {
        if (!isNullOrUndefined(actual)) {
            this.log(`[E2E] Validation failed`, LogLevel.error, { message });
        }
    }

    private log(message: string, logType: LogLevel = LogLevel.info, properties?: { [name: string]: string }): void {
        this.logger.log(message, logType, {
            ...properties,
        });
    }
}
