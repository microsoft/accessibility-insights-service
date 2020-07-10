// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable:no-import-side-effect no-any
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { PromiseUtils, ScanRunTimeConfig, ServiceConfiguration, System } from 'common';
import { IMock, It, Mock, Times } from 'typemoq';
import * as util from 'util';
import { AxeScanResults } from './axe-scan-results';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { Page } from './page';
import { Scanner } from './scanner';
import { MockableLogger } from './test-utilities/mockable-logger';

// tslint:disable: no-object-literal-type-assertion no-unsafe-any

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
            setupNewPageCall(url);
            setupPageScanCall(url, axeResultsStub);

            setupWaitForPromisetoReturnOriginalPromise();
            await scanner.scan(url);

            verifyMocks();
        });

        it('should close browser if exception occurs', async () => {
            const url = 'some url';
            const errorMessage: string = `An error occurred while scanning website page ${url}.`;
            setupNewPageCall(url);
            const axeScanResults = setupPageErrorScanCall(url, errorMessage);
            setupPageCloseCall();
            setupWaitForPromisetoReturnOriginalPromise();

            loggerMock
                .setup((o) => {
                    o.logError(`An error occurred while scanning website page.`, { url, error: System.serializeError(axeScanResults) });
                })
                .verifiable();

            const expectedResult = util.inspect(axeScanResults);

            const scanResult: AxeScanResults = await scanner.scan(url);
            expect(scanResult.error).toEqual(expectedResult);

            verifyMocks();
        });

        it('should return timeout promise', async () => {
            const url = 'some url';
            const errorMessage: string = `An error occurred while scanning website page ${url}.`;
            setupNewPageCall(url);
            setupPageErrorScanCall(url, errorMessage);
            setupPageCloseCall();
            setupWaitForPromiseToReturnTimeoutPromise();

            const scanResult: AxeScanResults = await scanner.scan(url);
            expect(scanResult).toEqual({
                error: {
                    errorType: 'ScanTimeout',
                    message: `Scan timed out after ${scanConfig.scanTimeoutInMin} minutes`,
                },
                pageResponseCode: undefined,
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

    function setupNewPageCall(url: string): void {
        pageMock.setup(async (p) => p.create()).verifiable(Times.once());
        pageMock.setup(async (p) => p.enableBypassCSP()).verifiable(Times.once());
    }

    function setupPageCloseCall(): void {
        pageMock.setup(async (b) => b.close()).verifiable();
    }

    function setupPageScanCall(url: string, axeResults: AxeResults): void {
        pageMock
            .setup(async (p) => p.scanForA11yIssues(url))
            .returns(async () => Promise.resolve({ results: axeResults, pageResponseCode: 101 }))
            .verifiable(Times.once());
    }

    function setupPageErrorScanCall(url: string, errorMessage: string): AxeScanResults {
        const error = { error: errorMessage, pageResponseCode: 101 };
        pageMock
            .setup(async (p) => p.scanForA11yIssues(url))
            .returns(async () => Promise.reject(error))
            .verifiable(Times.once());

        return error;
    }

    function verifyMocks(): void {
        pageMock.verifyAll();
        promiseUtilsMock.verifyAll();
    }
});
