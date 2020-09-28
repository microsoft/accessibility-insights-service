// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page } from 'puppeteer';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { PageScanner, ScanResult } from '../scanners/page-scanner';
import { BlobStore } from '../storage/store-types';
import { AccessibilityScanOperation } from './accessibility-scan-operation';

/* eslint-disable @typescript-eslint/no-explicit-any, no-empty, @typescript-eslint/no-empty-function */
describe(AccessibilityScanOperation, () => {
    let accessibilityScanOp: AccessibilityScanOperation;
    let scannerMock: IMock<PageScanner>;
    let pageMock: IMock<Page>;
    let blobStoreMock: IMock<BlobStore>;
    const id = 'id';
    let scanResult: ScanResult;

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions

        pageMock = Mock.ofType();
        blobStoreMock = Mock.ofType();
        scannerMock = Mock.ofType(PageScanner, MockBehavior.Strict);

        accessibilityScanOp = new AccessibilityScanOperation(scannerMock.object);
    });

    it('Run page scan operation, no violations', async () => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        scanResult = {
            axeResults: {
                url: 'url',
                passes: [],
                violations: [],
                incomplete: [],
                inapplicable: [],
            },
            report: {
                asHTML: () => 'html',
            },
        } as ScanResult;

        setMocks();

        await accessibilityScanOp.run(pageMock.object, id, blobStoreMock.object);
    });

    it('Run page scan operation, with violations', async () => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        scanResult = {
            axeResults: {
                url: 'url',
                passes: [],
                violations: [{ nodes: [] }],
                incomplete: [],
                inapplicable: [],
            },
            report: {
                asHTML: () => 'html',
            },
        } as ScanResult;

        setMocks();

        await accessibilityScanOp.run(pageMock.object, id, blobStoreMock.object);
    });

    function setMocks(): void {
        blobStoreMock
            .setup((s) => s.setValue(`${id}.axe`, scanResult.axeResults))
            .returns(async () => {})
            .verifiable(Times.once());
        blobStoreMock
            .setup((s) => s.setValue(`${id}.report`, scanResult.report.asHTML(), { contentType: 'text/html' }))
            .returns(async () => {})
            .verifiable(Times.once());
        scannerMock
            .setup((s) => s.scan(It.isAny()))
            .returns(async () => scanResult)
            .verifiable(Times.once());
    }

    afterEach(() => {
        pageMock.verifyAll();
        blobStoreMock.verifyAll();
        scannerMock.verifyAll();
    });
});
