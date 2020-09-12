// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { Page } from 'puppeteer';
import { PageConfigurator, PageResponseProcessor } from 'scanner-global-library';
import { IMock, Mock } from 'typemoq';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { BlobStore, DataStore } from '../storage/store-types';
import { ClassicPageProcessor } from './classic-page-processor';
import { PartialScanData } from './page-processor-base';

// tslint:disable: no-any

describe(ClassicPageProcessor, () => {
    let requestQueueMock: IMock<Apify.RequestQueue>;
    let accessibilityScanOpMock: IMock<AccessibilityScanOperation>;
    let dataStoreMock: IMock<DataStore>;
    let blobStoreMock: IMock<BlobStore>;
    let enqueueLinksExtMock: IMock<typeof Apify.utils.enqueueLinks>;
    let pageResponseProcessorMock: IMock<PageResponseProcessor>;
    let pageConfiguratorMock: IMock<PageConfigurator>;

    const testUrl = 'test url';
    const testId = 'test id';
    const discoveryPatterns = ['pattern1', 'pattern2'];
    let requestStub: Apify.Request;
    let pageStub: Page;

    let classicPageProcessor: ClassicPageProcessor;

    beforeEach(() => {
        requestQueueMock = Mock.ofType<Apify.RequestQueue>();
        accessibilityScanOpMock = Mock.ofType<AccessibilityScanOperation>();
        dataStoreMock = Mock.ofType<DataStore>();
        blobStoreMock = Mock.ofType<BlobStore>();
        enqueueLinksExtMock = Mock.ofType<typeof Apify.utils.enqueueLinks>();
        pageResponseProcessorMock = Mock.ofType<PageResponseProcessor>();
        pageConfiguratorMock = Mock.ofType<PageConfigurator>();
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
            accessibilityScanOpMock.object,
            dataStoreMock.object,
            blobStoreMock.object,
            pageResponseProcessorMock.object,
            pageConfiguratorMock.object,
            requestQueueMock.object,
            false,
            discoveryPatterns,
            enqueueLinksExtMock.object,
        );
    });

    afterEach(() => {
        enqueueLinksExtMock.verifyAll();
        accessibilityScanOpMock.verifyAll();
        blobStoreMock.verifyAll();
    });

    it('pageProcessor', async () => {
        setupEnqueueLinks(pageStub);
        accessibilityScanOpMock.setup((aso) => aso.run(pageStub, testId, blobStoreMock.object)).verifiable();
        const expectedScanData = {
            id: testId,
            url: testUrl,
            succeeded: true,
        };
        setupPushScanData(expectedScanData);

        // tslint:disable-next-line: no-any
        const inputs: Apify.PuppeteerHandlePageInputs = { page: pageStub, request: requestStub } as any;
        await classicPageProcessor.pageHandler(inputs);
    });

    function setupEnqueueLinks(page: Page): void {
        const options = {
            page: pageStub,
            requestQueue: requestQueueMock.object,
            pseudoUrls: discoveryPatterns,
        };
        enqueueLinksExtMock
            .setup((el) => el(options))
            .returns(async () => [])
            .verifiable();
    }

    function setupPushScanData(expectedScanData: PartialScanData): void {
        const id = `${expectedScanData.id}.data`;
        blobStoreMock.setup((bs) => bs.setValue(id, expectedScanData)).verifiable();
    }
});
