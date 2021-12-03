// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page } from 'puppeteer';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { AxeResults } from 'axe-core';
import { PromiseUtils } from 'common';
import { PageScanner } from '../scanners/page-scanner';
import { BlobStore } from '../storage/store-types';
import { ReportGenerator } from '../reports/report-generator';
import { AccessibilityScanOperation } from './accessibility-scan-operation';

/* eslint-disable @typescript-eslint/no-explicit-any, no-empty, @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/consistent-type-assertions */

describe(AccessibilityScanOperation, () => {
    const id = 'id';
    const pageUrl = 'url';
    const pageTitle = 'title';
    const report = {
        asHTML: () => 'html',
    };

    let accessibilityScanOp: AccessibilityScanOperation;
    let scannerMock: IMock<PageScanner>;
    let pageMock: IMock<Page>;
    let blobStoreMock: IMock<BlobStore>;
    let reportGeneratorMock: IMock<ReportGenerator>;
    let axeResults: AxeResults;
    let promiseUtilsMock: IMock<PromiseUtils>;

    beforeEach(() => {
        AccessibilityScanOperation.axeScanTimeoutSec = 1;
        AccessibilityScanOperation.waitForPageScrollSec = 1;

        pageMock = Mock.ofType<Page>();
        blobStoreMock = Mock.ofType();
        reportGeneratorMock = Mock.ofType<ReportGenerator>();
        scannerMock = Mock.ofType(PageScanner, MockBehavior.Strict);
        promiseUtilsMock = Mock.ofType(PromiseUtils);

        accessibilityScanOp = new AccessibilityScanOperation(
            scannerMock.object,
            reportGeneratorMock.object,
            blobStoreMock.object,
            promiseUtilsMock.object,
        );
    });

    afterEach(() => {
        pageMock.verifyAll();
        blobStoreMock.verifyAll();
        scannerMock.verifyAll();
        reportGeneratorMock.verifyAll();
        promiseUtilsMock.verifyAll();
    });

    it('Run page scan operation, no violations', async () => {
        axeResults = {
            url: 'url',
            passes: [],
            violations: [],
            incomplete: [],
            inapplicable: [],
        } as AxeResults;

        setMocks(axeResults);
        setupWaitForFn();

        await accessibilityScanOp.run(pageMock.object, id);
    });

    it('Run page scan operation, with violations', async () => {
        axeResults = {
            url: 'url',
            passes: [],
            violations: [{ nodes: [] }],
            incomplete: [],
            inapplicable: [],
        } as AxeResults;

        setMocks(axeResults);
        setupWaitForFn();

        await accessibilityScanOp.run(pageMock.object, id);
    });

    it('Run page scan operation with timeout and success', async () => {
        axeResults = {
            url: 'url',
            passes: [],
            violations: [],
            incomplete: [],
            inapplicable: [],
        } as AxeResults;

        setMocks(axeResults, 2);
        setupWaitForFn(1);

        pageMock
            .setup(async (o) => o.evaluate(It.isAny()))
            .returns(() => Promise.resolve())
            .verifiable();

        await accessibilityScanOp.run(pageMock.object, id);
    });

    it('Run page scan operation with timeout and exception', async () => {
        axeResults = {
            url: 'url',
            passes: [],
            violations: [],
            incomplete: [],
            inapplicable: [],
        } as AxeResults;

        setMocks(axeResults, 2);
        setupWaitForFn(2);

        blobStoreMock.reset();
        pageMock.reset();
        reportGeneratorMock.reset();
        pageMock
            .setup(async (o) => o.evaluate(It.isAny()))
            .returns(() => Promise.resolve())
            .verifiable();

        await expect(() => accessibilityScanOp.run(pageMock.object, id)).rejects.toThrowError(`Accessibility scan timed out`);
    });

    function setMocks(axeResult: AxeResults, scanRetryCount: number = 1): void {
        blobStoreMock
            .setup((s) => s.setValue(`${id}.axe`, axeResults))
            .returns(async () => {})
            .verifiable(Times.once());
        blobStoreMock
            .setup((s) => s.setValue(`${id}.report`, report.asHTML(), { contentType: 'text/html' }))
            .returns(async () => {})
            .verifiable(Times.once());
        scannerMock
            .setup((s) => s.scan(It.isAny(), It.isAny()))
            .returns(async () => axeResult)
            .verifiable(Times.exactly(scanRetryCount));
        reportGeneratorMock
            .setup((o) => o.generateReport(axeResult, pageUrl, pageTitle))
            .returns(() => report)
            .verifiable();
        pageMock
            .setup((o) => o.url())
            .returns(() => pageUrl)
            .verifiable(Times.atLeastOnce());
        pageMock
            .setup(async (o) => o.title())
            .returns(() => Promise.resolve(pageTitle))
            .verifiable();
    }

    function setupWaitForFn(timesToFailWithTimeout: number = 0): void {
        let runsWithTimeoutCount = 0;
        promiseUtilsMock
            .setup((s) => s.waitFor(It.isAny(), AccessibilityScanOperation.axeScanTimeoutSec * 1000, It.isAny()))
            .returns(async (actonFn, timeout, callback) => {
                if (runsWithTimeoutCount >= timesToFailWithTimeout) {
                    return actonFn;
                } else {
                    runsWithTimeoutCount++;

                    return callback();
                }
            })
            .verifiable(Times.atLeastOnce());
    }
});
