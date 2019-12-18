// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosContainerClient } from 'azure-services';
import { AvailabilityTestConfig, GuidGenerator } from 'common';
import { Logger, LogLevel } from 'logger';
import { isNullOrUndefined } from 'util';
import { A11yServiceClient } from 'web-api-client';

import { isEqual } from 'lodash';
import { HttpResponse, WebApiErrorCode } from 'service-library';
import { SerializableResponse } from '../request-data';

export abstract class TestGroup {
    private readonly testCases: (() => Promise<void>)[] = [];

    constructor(
        protected readonly buildId: string,
        protected readonly scanId: string,
        protected readonly testGroupName: string,
        protected readonly a11yServiceClient: A11yServiceClient,
        protected readonly cosmosContainerClient: CosmosContainerClient,
        protected readonly logger: Logger,
        protected readonly guidGenerator: GuidGenerator,
        protected readonly defaultLogProps: { [name: string]: string },
        protected readonly testConfig: AvailabilityTestConfig,
    ) {}

    public async run(): Promise<void> {
        this.registerTestCases();
        this.initialize();
        this.testCases.forEach(async test => {
            await test();
        });
        this.cleanup();
    }

    protected abstract registerTestCases(): void;

    protected registerTestCase(test: () => Promise<void>): void {
        this.testCases.push(test);
    }

    // tslint:disable-next-line: no-empty
    protected initialize(): void {}

    // tslint:disable-next-line: no-empty
    protected cleanup(): void {}

    protected expectEqual<T>(expected: T, actual: T, message?: string): void {
        if (expected !== actual) {
            throw new Error(`[E2E Validation failed] ${message}`);
        }
    }

    protected expectTrue<T>(actual: boolean, message?: string): void {
        if (actual !== true) {
            throw new Error(`[E2E Validation failed] ${message}`);
        }
    }

    protected expectFalse<T>(actual: boolean, message?: string): void {
        if (actual !== false) {
            throw new Error(`[E2E Validation failed] ${message}`);
        }
    }

    protected expectToBeDefined<T>(actual: T, message?: string): void {
        if (isNullOrUndefined(actual)) {
            throw new Error(`[E2E Validation failed] ${message}`);
        }
    }

    protected expectToBeNotDefined<T>(actual: T, message?: string): void {
        if (!isNullOrUndefined(actual)) {
            throw new Error(`[E2E Validation failed] ${message}`);
        }
    }

    protected ensureSuccessStatusCode(response: SerializableResponse): void {
        if (response.statusCode < 200 || response.statusCode >= 300) {
            this.log(`[E2E] Scan request failed`, LogLevel.error, {
                requestResponse: JSON.stringify(response),
            });

            throw new Error(`Request failed ${JSON.stringify(response)}`);
        }
    }

    protected expectErrorResponse(webApiErrorCode: WebApiErrorCode, response: SerializableResponse): void {
        if (!isEqual(HttpResponse.getErrorResponse(webApiErrorCode), response)) {
            this.log(`[E2E] Scan response not as expected`, LogLevel.error, {
                requestResponse: JSON.stringify(response),
            });

            throw new Error(`Request not as expected ${JSON.stringify(response)}`);
        }
    }

    private log(message: string, logType: LogLevel = LogLevel.info, properties?: { [name: string]: string }): void {
        this.logger.log(message, logType, {
            ...this.defaultLogProps,
            ...properties,
        });
    }
}
