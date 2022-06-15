// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { fail } from 'assert';
import { PromiseUtils, ServiceConfiguration, System, TaskRuntimeConfig } from 'common';
import { BrowserError, Page, PrivacyScanResult } from 'scanner-global-library';
import { IMock, It, Mock } from 'typemoq';
import { PrivacyScannerCore } from 'privacy-scan-core';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { PrivacyScanner } from './privacy-scanner';

/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any */

describe(PrivacyScanner, () => {
    const taskRunBufferTimeMinute = 5;

    let privacyScanner: PrivacyScanner;
    let pageMock: IMock<Page>;
    let loggerMock: IMock<MockableLogger>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let promiseUtilsMock: IMock<PromiseUtils>;
    let privacyScannerCoreMock: IMock<PrivacyScannerCore>;
    let taskConfig: TaskRuntimeConfig;

    beforeEach(() => {
        pageMock = Mock.ofType(Page);
        loggerMock = Mock.ofType(MockableLogger);
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        promiseUtilsMock = Mock.ofType(PromiseUtils);
        privacyScannerCoreMock = Mock.ofType(PrivacyScannerCore);

        taskConfig = {
            taskTimeoutInMinutes: 7,
        } as TaskRuntimeConfig;
        serviceConfigMock
            .setup((s) => s.getConfigValue('taskConfig'))
            .returns(() => Promise.resolve(taskConfig))
            .verifiable();

        privacyScanner = new PrivacyScanner(
            privacyScannerCoreMock.object,
            promiseUtilsMock.object,
            serviceConfigMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        pageMock.verifyAll();
        promiseUtilsMock.verifyAll();
        loggerMock.verifyAll();
        privacyScannerCoreMock.verifyAll();
    });

    it('should launch browser page with given url and scan the page', async () => {
        const expectedResult = { state: 'pass' } as PrivacyScanResult;
        setupWaitForPromisetoReturnOriginalPromise();
        privacyScannerCoreMock
            .setup((o) => o.scan(pageMock.object))
            .returns(async () => expectedResult)
            .verifiable();

        const actualResult = await privacyScanner.scan(pageMock.object);
        expect(actualResult).toEqual(expectedResult);
    });

    it('should throw errors', async () => {
        const scanError = { error: 'scan error', pageResponseCode: 101 };
        privacyScannerCoreMock
            .setup((o) => o.scan(pageMock.object))
            .throws(scanError as unknown as Error)
            .verifiable();
        privacyScanner = new PrivacyScanner(
            privacyScannerCoreMock.object,
            promiseUtilsMock.object,
            serviceConfigMock.object,
            loggerMock.object,
        );

        setupWaitForPromisetoReturnOriginalPromise();
        loggerMock
            .setup((o) => {
                o.logError(`An error occurred while running privacy scan of a webpage.`, { error: System.serializeError(scanError) });
            })
            .verifiable();
        try {
            await privacyScanner.scan(pageMock.object);
            fail('should throw');
        } catch (err) {
            expect(err).toEqual(scanError);
        }
    });

    it('should return timeout promise', async () => {
        setupWaitForPromiseToReturnTimeoutPromise();

        const scanResult = await privacyScanner.scan(pageMock.object);

        expect((scanResult.error as BrowserError).stack).toBeTruthy();
        (scanResult.error as BrowserError).stack = 'stack';
        expect(scanResult).toEqual({
            error: {
                errorType: 'ScanTimeout',
                message: `Privacy scan timed out after ${taskConfig.taskTimeoutInMinutes - taskRunBufferTimeMinute} minutes`,
                stack: 'stack',
            },
        } as PrivacyScanResult);
    });

    function setupWaitForPromisetoReturnOriginalPromise(): void {
        promiseUtilsMock
            .setup((s) => s.waitFor(It.isAny(), (taskConfig.taskTimeoutInMinutes - taskRunBufferTimeMinute) * 60000, It.isAny()))
            .returns(async (scanPromiseObj, timeout, timeoutCb) => {
                return scanPromiseObj;
            })
            .verifiable();
    }

    function setupWaitForPromiseToReturnTimeoutPromise(): void {
        promiseUtilsMock
            .setup((s) => s.waitFor(It.isAny(), (taskConfig.taskTimeoutInMinutes - taskRunBufferTimeMinute) * 60000, It.isAny()))
            .returns(async (scanPromiseObj, timeout, timeoutCb) => {
                return timeoutCb();
            })
            .verifiable();
    }
});
