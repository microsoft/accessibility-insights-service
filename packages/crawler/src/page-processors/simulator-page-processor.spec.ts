// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { Page } from 'puppeteer';
import { PageConfigurator, PageResponseProcessor } from 'scanner-global-library';
import { IMock, Mock } from 'typemoq';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { ClickElementOperation } from '../page-operations/click-element-operation';
import { EnqueueActiveElementsOperation } from '../page-operations/enqueue-active-elements-operation';
import { BlobStore, DataStore } from '../storage/store-types';
import { SimulatorPageProcessor } from './simulator-page-processor';

// tslint:disable: no-any

describe(SimulatorPageProcessor, () => {
    let requestQueueMock: IMock<Apify.RequestQueue>;
    let accessibilityScanOpMock: IMock<AccessibilityScanOperation>;
    let dataStoreMock: IMock<DataStore>;
    let blobStoreMock: IMock<BlobStore>;
    let enqueueLinksExtMock: IMock<typeof Apify.utils.enqueueLinks>;
    let clickElementOpMock: IMock<ClickElementOperation>;
    let enqueueActiveElementsOpExtMock: IMock<EnqueueActiveElementsOperation>;
    let pageResponseProcessorMock: IMock<PageResponseProcessor>;
    let pageConfiguratorMock: IMock<PageConfigurator>;

    const testUrl = 'test url';
    const testId = 'test id';
    const discoveryPatterns = ['pattern1', 'pattern2'];
    const selectors = ['button'];
    let requestStub: Apify.Request;
    let pageStub: Page;

    let simulatorPageProcessor: SimulatorPageProcessor;

    beforeEach(() => {
        requestQueueMock = Mock.ofType<Apify.RequestQueue>();
        accessibilityScanOpMock = Mock.ofType<AccessibilityScanOperation>();
        dataStoreMock = Mock.ofType<DataStore>();
        blobStoreMock = Mock.ofType<BlobStore>();
        enqueueLinksExtMock = Mock.ofType<typeof Apify.utils.enqueueLinks>();
        clickElementOpMock = Mock.ofType<ClickElementOperation>();
        enqueueActiveElementsOpExtMock = Mock.ofType<EnqueueActiveElementsOperation>();
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

        simulatorPageProcessor = new SimulatorPageProcessor(
            accessibilityScanOpMock.object,
            dataStoreMock.object,
            blobStoreMock.object,
            enqueueActiveElementsOpExtMock.object,
            clickElementOpMock.object,
            pageResponseProcessorMock.object,
            pageConfiguratorMock.object,
            requestQueueMock.object,
            selectors,
            false,
            discoveryPatterns,
            enqueueLinksExtMock.object,
        );
    });

    afterEach(() => {
        enqueueLinksExtMock.verifyAll();
        accessibilityScanOpMock.verifyAll();
        blobStoreMock.verifyAll();
        enqueueActiveElementsOpExtMock.verifyAll();
        clickElementOpMock.verifyAll();
    });

    it('pageProcessor, no-op', async () => {
        setupEnqueueLinks(pageStub);
        accessibilityScanOpMock.setup((aso) => aso.run(pageStub, testId, blobStoreMock.object)).verifiable();
        const expectedScanData = {
            id: testId,
            url: testUrl,
            succeeded: true,
        };
        blobStoreMock.setup((bs) => bs.setValue(`${expectedScanData.id}.data`, expectedScanData)).verifiable();

        const inputs: Apify.PuppeteerHandlePageInputs = { page: pageStub, request: requestStub } as any;
        await simulatorPageProcessor.pageHandler(inputs);
    });

    it('pageProcessor, click', async () => {
        const activeElement = { html: 'html', selector: 'button', clickAction: 'page-action' };
        const requestStubClick = {
            id: testId,
            url: testUrl,
            userData: { operationType: 'click', data: activeElement },
            errorMessages: [],
        } as any;

        setupEnqueueLinks(pageStub);
        accessibilityScanOpMock.setup((aso) => aso.run(pageStub, testId, blobStoreMock.object)).verifiable();
        const expectedScanData = {
            id: testId,
            url: testUrl,
            succeeded: true,
            activatedElement: activeElement,
        };
        // tslint:disable-next-line: no-unsafe-any
        blobStoreMock.setup((bs) => bs.setValue(`${expectedScanData.id}.data`, expectedScanData));

        clickElementOpMock
            .setup((cem) => cem.click(pageStub, 'button', requestQueueMock.object, discoveryPatterns))
            .returns(async () => Promise.resolve({ clickAction: 'page-action' }))
            .verifiable();

        const inputs: Apify.PuppeteerHandlePageInputs = { page: pageStub, request: requestStubClick } as any;
        await simulatorPageProcessor.pageHandler(inputs);
    });

    function setupEnqueueLinks(page: Page): void {
        const options = {
            page: page,
            requestQueue: requestQueueMock.object,
            pseudoUrls: discoveryPatterns,
        };
        enqueueLinksExtMock
            .setup((el) => el(options))
            .returns(async () => [])
            .verifiable();
    }
});
