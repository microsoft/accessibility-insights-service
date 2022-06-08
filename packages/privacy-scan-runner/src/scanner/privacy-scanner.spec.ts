// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { fail } from 'assert';
import { PromiseUtils, System } from 'common';
import { BrowserError, Page, PrivacyScanResult } from 'scanner-global-library';
import { IMock, It, Mock } from 'typemoq';
import { CookieScenario } from 'privacy-scan-core';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { PrivacyScanner } from './privacy-scanner';

/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any */

describe(PrivacyScanner, () => {
    const maxPageNavigationTimeMsec = 5;

    let privacyScanner: PrivacyScanner;
    let pageMock: IMock<Page>;
    let loggerMock: IMock<MockableLogger>;
    let promiseUtilsMock: IMock<PromiseUtils>;
    let getCookieScenarios: () => CookieScenario[];
    let scanTimeoutMsec: number;

    beforeEach(() => {
        pageMock = Mock.ofType(Page);
        loggerMock = Mock.ofType(MockableLogger);
        promiseUtilsMock = Mock.ofType(PromiseUtils);
        getCookieScenarios = () => [{}, {}, {}] as CookieScenario[];
        scanTimeoutMsec = maxPageNavigationTimeMsec * getCookieScenarios().length;

        privacyScanner = new PrivacyScanner(promiseUtilsMock.object, loggerMock.object, getCookieScenarios, maxPageNavigationTimeMsec);
    });

    afterEach(() => {
        pageMock.verifyAll();
        promiseUtilsMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('should launch browser page with given url and scan the page', async () => {
        const expectedResult = { state: 'pass' } as PrivacyScanResult;
        setupWaitForPromisetoReturnOriginalPromise();
        pageMock.setup((p) => p.scanForPrivacy()).returns(async () => expectedResult);

        const actualResult = await privacyScanner.scan(pageMock.object);
        expect(actualResult).toEqual(expectedResult);
    });

    it('should throw errors', async () => {
        const scanError = { error: 'scan error', pageResponseCode: 101 };
        pageMock.setup((p) => p.scanForPrivacy()).throws(scanError as unknown as Error);
        privacyScanner = new PrivacyScanner(promiseUtilsMock.object, loggerMock.object, getCookieScenarios, maxPageNavigationTimeMsec);

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
                message: `Privacy scan timed out after ${scanTimeoutMsec / 60000} minutes`,
                stack: 'stack',
            },
        } as PrivacyScanResult);
    });

    function setupWaitForPromisetoReturnOriginalPromise(): void {
        promiseUtilsMock
            .setup((s) => s.waitFor(It.isAny(), scanTimeoutMsec, It.isAny()))
            .returns(async (scanPromiseObj, timeout, timeoutCb) => {
                return scanPromiseObj;
            })
            .verifiable();
    }

    function setupWaitForPromiseToReturnTimeoutPromise(): void {
        promiseUtilsMock
            .setup((s) => s.waitFor(It.isAny(), scanTimeoutMsec, It.isAny()))
            .returns(async (scanPromiseObj, timeout, timeoutCb) => {
                return timeoutCb();
            })
            .verifiable();
    }
});
