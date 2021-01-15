// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { fail } from 'assert';
import { AxeResults } from 'axe-core';
import { PromiseUtils, ScanRunTimeConfig, ServiceConfiguration, System } from 'common';
import { AxePuppeteerFactory, AxeScanResults, BrowserError, Page } from 'scanner-global-library';
import { IMock, It, Mock, Times } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { Scanner } from './scanner';

/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any */

describe('Scanner', () => {
    let pageMock: IMock<Page>;
    let scanner: Scanner;
    let axeBrowserFactoryMock: IMock<AxePuppeteerFactory>;
    let loggerMock: IMock<MockableLogger>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let promiseUtilsMock: IMock<PromiseUtils>;
    let scanConfig: ScanRunTimeConfig;

    beforeEach(() => {
        axeBrowserFactoryMock = Mock.ofType();
        pageMock = Mock.ofType2<Page>(Page, [axeBrowserFactoryMock.object]);
        loggerMock = Mock.ofType(MockableLogger);
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        promiseUtilsMock = Mock.ofType(PromiseUtils);

        scanConfig = {
            scanTimeoutInMin: 5,
        } as ScanRunTimeConfig;

        scanner = new Scanner(pageMock.object, loggerMock.object, promiseUtilsMock.object, serviceConfigMock.object);
    });

    it('should create instance', () => {
        expect(scanner).not.toBeNull();
    });

    describe('scan', () => {
        beforeEach(() => {
            serviceConfigMock.setup((s) => s.getConfigValue('scanConfig')).returns(() => Promise.resolve(scanConfig));
        });

        it('should launch browser page with given url and scan the page with axe-core', async () => {
            const url = 'some url';
            const axeResultsStub = ('axe results' as any) as AxeResults;

            setupNewPageCall();
            setupPageNavigateCall(url);
            setupPageScanCall(axeResultsStub);
            setupWaitForPromisetoReturnOriginalPromise();

            await scanner.scan(url);

            verifyMocks();
        });

        it('should close browser if exception occurs', async () => {
            const url = 'some url';
            const errorMessage: string = `An error occurred while scanning website page ${url}.`;
            const axeScanResults = setupPageErrorScanCall(errorMessage);

            setupNewPageCall();
            setupPageNavigateCall(url);
            setupPageCloseCall();
            setupWaitForPromisetoReturnOriginalPromise();
            loggerMock
                .setup((o) => {
                    o.logError(`An error occurred while scanning website page.`, { url, error: System.serializeError(axeScanResults) });
                })
                .verifiable();

            try {
                await scanner.scan(url);
                fail('should throw');
            } catch (err) {
                expect(err).toEqual({ error: 'An error occurred while scanning website page some url.', pageResponseCode: 101 });
            }

            verifyMocks();
            loggerMock.verifyAll();
        });

        it('should return timeout promise', async () => {
            const url = 'some url';
            const errorMessage: string = `An error occurred while scanning website page ${url}.`;

            setupNewPageCall();
            setupPageNavigateCall(url);
            setupPageErrorScanCall(errorMessage);
            setupPageCloseCall();
            setupWaitForPromiseToReturnTimeoutPromise();

            const scanResult = await scanner.scan(url);

            expect((scanResult.error as BrowserError).stack).toBeTruthy();
            (scanResult.error as BrowserError).stack = 'stack';
            expect(scanResult).toEqual({
                error: {
                    errorType: 'ScanTimeout',
                    message: `Scan timed out after ${scanConfig.scanTimeoutInMin} minutes`,
                    stack: 'stack',
                },
            } as AxeScanResults);

            pageMock.reset();
            verifyMocks();
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

    function setupNewPageCall(): void {
        pageMock.setup(async (p) => p.create()).verifiable(Times.once());
    }

    function setupPageCloseCall(): void {
        pageMock.setup(async (b) => b.close()).verifiable();
    }

    function setupPageNavigateCall(url: string): void {
        pageMock.setup((p) => p.navigateToUrl(url)).verifiable(Times.once());
    }

    function setupPageScanCall(axeResults: AxeResults): void {
        pageMock
            .setup(async (p) => p.scanForA11yIssues())
            .returns(async () => Promise.resolve({ results: axeResults, pageResponseCode: 101 }))
            .verifiable(Times.once());
    }

    function setupPageErrorScanCall(errorMessage: string): AxeScanResults {
        const error = { error: errorMessage, pageResponseCode: 101 };
        pageMock
            .setup(async (p) => p.scanForA11yIssues())
            .returns(async () => Promise.reject(error))
            .verifiable(Times.once());

        return error;
    }

    function verifyMocks(): void {
        pageMock.verifyAll();
        promiseUtilsMock.verifyAll();
    }
});
