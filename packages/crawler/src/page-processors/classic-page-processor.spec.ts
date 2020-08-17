// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { Logger } from 'logger';
import { Page } from 'puppeteer';
import { IMock, Mock } from 'typemoq';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { BlobStore, DataStore } from '../storage/store-types';
import { ClassicPageProcessor } from './classic-page-processor';
import { PageProcessorHelper } from './page-processor-helper';

// tslint:disable: no-any

describe(ClassicPageProcessor, () => {
    let helperMock: IMock<PageProcessorHelper>;
    let requestQueueMock: IMock<Apify.RequestQueue>;
    let loggerMock: IMock<Logger>;
    let accessibilityScanOpMock: IMock<AccessibilityScanOperation>;
    let dataStoreMock: IMock<DataStore>;
    let blobStoreMock: IMock<BlobStore>;

    const testUrl = 'test url';
    const testId = 'test id';
    const discoveryPatterns = ['pattern1', 'pattern2'];
    let requestStub: Apify.Request;
    let pageStub: Page;

    let classicPageProcessor: ClassicPageProcessor;

    beforeEach(() => {
        helperMock = Mock.ofType<PageProcessorHelper>();
        requestQueueMock = Mock.ofType<Apify.RequestQueue>();
        loggerMock = Mock.ofType<Logger>();
        accessibilityScanOpMock = Mock.ofType<AccessibilityScanOperation>();
        dataStoreMock = Mock.ofType<DataStore>();
        blobStoreMock = Mock.ofType<BlobStore>();
        requestStub = {
            id: testId,
            url: testUrl,
            userData: {},
            errorMessages: [],
        } as any;
        pageStub = {
            url: () => testUrl,
        } as any;

        classicPageProcessor = new ClassicPageProcessor(
            requestQueueMock.object,
            loggerMock.object,
            helperMock.object,
            discoveryPatterns,
            accessibilityScanOpMock.object,
            dataStoreMock.object,
            blobStoreMock.object,
        );
    });

    afterEach(() => {
        loggerMock.verifyAll();
        helperMock.verifyAll();
        accessibilityScanOpMock.verifyAll();
    });

    it('pageProcessor', async () => {
        loggerMock.setup((l) => l.logInfo(`Crawling page ${testUrl}`)).verifiable();
        helperMock.setup((h) => h.enqueueLinks(pageStub, requestQueueMock.object, discoveryPatterns)).verifiable();
        accessibilityScanOpMock.setup((aso) => aso.run(pageStub, testId, blobStoreMock.object)).verifiable();
        const expectedScanData = {
            id: testId,
            url: testUrl,
        };
        helperMock.setup((h) => h.pushScanData(blobStoreMock.object, expectedScanData)).verifiable();

        // tslint:disable-next-line: no-any
        const inputs: Apify.PuppeteerHandlePageInputs = { page: pageStub, request: requestStub } as any;
        await classicPageProcessor.pageProcessor(inputs);
    });
});
