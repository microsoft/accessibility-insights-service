// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page } from 'puppeteer';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { AxeResults } from 'axe-core';
import { PageScanner } from '../scanners/page-scanner';
import { BlobStore } from '../storage/store-types';
import { ReportGenerator } from '../reports/report-generator';
import { AccessibilityScanOperation } from './accessibility-scan-operation';

/* eslint-disable @typescript-eslint/no-explicit-any, no-empty, @typescript-eslint/no-empty-function */
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

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        pageMock = Mock.ofType<Page>();
        blobStoreMock = Mock.ofType();
        reportGeneratorMock = Mock.ofType<ReportGenerator>();
        scannerMock = Mock.ofType(PageScanner, MockBehavior.Strict);

        accessibilityScanOp = new AccessibilityScanOperation(scannerMock.object, reportGeneratorMock.object, blobStoreMock.object);
    });

    it('Run page scan operation, no violations', async () => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        axeResults = {
            url: 'url',
            passes: [],
            violations: [],
            incomplete: [],
            inapplicable: [],
        } as AxeResults;

        setMocks(axeResults);

        await accessibilityScanOp.run(pageMock.object, id);
    });

    it('Run page scan operation, with violations', async () => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        axeResults = {
            url: 'url',
            passes: [],
            violations: [{ nodes: [] }],
            incomplete: [],
            inapplicable: [],
        } as AxeResults;

        setMocks(axeResults);

        await accessibilityScanOp.run(pageMock.object, id);
    });

    function setMocks(axeResult: AxeResults): void {
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
            .verifiable(Times.once());
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

    afterEach(() => {
        pageMock.verifyAll();
        blobStoreMock.verifyAll();
        scannerMock.verifyAll();
        reportGeneratorMock.verifyAll();
    });
});
