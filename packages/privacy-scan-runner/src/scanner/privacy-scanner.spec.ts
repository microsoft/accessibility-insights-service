// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { fail } from 'assert';
import { PromiseUtils, ScanRunTimeConfig, ServiceConfiguration, System } from 'common';
import { BrowserError, Page, PrivacyScanResult } from 'scanner-global-library';
import { IMock, It, Mock } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { PrivacyScanner } from './privacy-scanner';

/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any */

describe(PrivacyScanner, () => {
    let privacyScanner: PrivacyScanner;
    let pageMock: IMock<Page>;
    let loggerMock: IMock<MockableLogger>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let promiseUtilsMock: IMock<PromiseUtils>;
    let scanConfig: ScanRunTimeConfig;

    beforeEach(() => {
        pageMock = Mock.ofType(Page);
        loggerMock = Mock.ofType(MockableLogger);
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        promiseUtilsMock = Mock.ofType(PromiseUtils);

        scanConfig = {
            scanTimeoutInMin: 5,
        } as ScanRunTimeConfig;
        serviceConfigMock.setup((s) => s.getConfigValue('scanConfig')).returns(() => Promise.resolve(scanConfig));

        privacyScanner = new PrivacyScanner(promiseUtilsMock.object, serviceConfigMock.object, loggerMock.object);
    });

    afterEach(() => {
        pageMock.verifyAll();
        promiseUtilsMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('should launch browser page with given url and scan the page', async () => {
        const expectedResult = { state: 'pass' } as PrivacyScanResult;
        setupWaitForPromisetoReturnOriginalPromise();

        const actualResult = await privacyScanner.scan(pageMock.object);
        expect(actualResult).toEqual(expectedResult);
    });

    it('should throw errors', async () => {
        const scanError = { error: 'scan error', pageResponseCode: 101 };
        privacyScanner = new PrivacyScanner(promiseUtilsMock.object, serviceConfigMock.object, loggerMock.object, () => {
            throw scanError;
        });

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
                message: `Privacy scan timed out after ${scanConfig.scanTimeoutInMin} minutes`,
                stack: 'stack',
            },
        } as PrivacyScanResult);
    });

    function setupWaitForPromisetoReturnOriginalPromise(): void {
        promiseUtilsMock
            .setup((s) => s.waitFor(It.isAny(), scanConfig.scanTimeoutInMin * 60000, It.isAny()))
            .returns(async (scanPromiseObj, timeout, timeoutCb) => {
                return scanPromiseObj;
            })
            .verifiable();
    }

    function setupWaitForPromiseToReturnTimeoutPromise(): void {
        promiseUtilsMock
            .setup((s) => s.waitFor(It.isAny(), scanConfig.scanTimeoutInMin * 60000, It.isAny()))
            .returns(async (scanPromiseObj, timeout, timeoutCb) => {
                return timeoutCb();
            })
            .verifiable();
    }
});
