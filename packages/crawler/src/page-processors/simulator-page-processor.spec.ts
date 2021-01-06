// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { Page } from 'puppeteer';
import { PageNavigator } from 'scanner-global-library';
import { IMock, Mock, It } from 'typemoq';
import { AxeResults } from 'axe-core';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { DataBase } from '../level-storage/data-base';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { ClickElementOperation } from '../page-operations/click-element-operation';
import { EnqueueActiveElementsOperation } from '../page-operations/enqueue-active-elements-operation';
import { BlobStore, DataStore } from '../storage/store-types';
import { ApifyRequestQueueProvider } from '../types/ioc-types';
import { SimulatorPageProcessor } from './simulator-page-processor';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions,  */

describe(SimulatorPageProcessor, () => {
    const testUrl = 'test url';
    const testId = 'test id';
    const discoveryPatterns = ['pattern1', 'pattern2'];
    const selectors = ['button'];

    let requestQueueStub: Apify.RequestQueue;
    let accessibilityScanOpMock: IMock<AccessibilityScanOperation>;
    let dataStoreMock: IMock<DataStore>;
    let blobStoreMock: IMock<BlobStore>;
    let dataBaseMock: IMock<DataBase>;
    let enqueueLinksExtMock: IMock<typeof Apify.utils.enqueueLinks>;
    let clickElementOpMock: IMock<ClickElementOperation>;
    let enqueueActiveElementsOpExtMock: IMock<EnqueueActiveElementsOperation>;
    let pageNavigatorMock: IMock<PageNavigator>;
    let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
    let requestQueueProvider: ApifyRequestQueueProvider;
    let requestStub: Apify.Request;
    let pageStub: Page;
    let simulatorPageProcessor: SimulatorPageProcessor;
    let axeResults: AxeResults;

    beforeEach(() => {
        requestQueueStub = {} as Apify.RequestQueue;
        accessibilityScanOpMock = Mock.ofType<AccessibilityScanOperation>();
        dataStoreMock = Mock.ofType<DataStore>();
        blobStoreMock = Mock.ofType<BlobStore>();
        dataBaseMock = Mock.ofType<DataBase>();
        enqueueLinksExtMock = Mock.ofType<typeof Apify.utils.enqueueLinks>();
        clickElementOpMock = Mock.ofType<ClickElementOperation>();
        enqueueActiveElementsOpExtMock = Mock.ofType<EnqueueActiveElementsOperation>();
        pageNavigatorMock = Mock.ofType<PageNavigator>();
        crawlerConfigurationMock = Mock.ofType(CrawlerConfiguration);

        crawlerConfigurationMock
            .setup((o) => o.discoveryPatterns())
            .returns(() => discoveryPatterns)
            .verifiable();
        crawlerConfigurationMock
            .setup((o) => o.snapshot())
            .returns(() => false)
            .verifiable();
        crawlerConfigurationMock
            .setup((o) => o.selectors())
            .returns(() => selectors)
            .verifiable();
        crawlerConfigurationMock
            .setup((o) => o.crawl())
            .returns(() => true)
            .verifiable();
        axeResults = {
            url: 'url',
            passes: [],
            violations: [{ nodes: [{}] }],
            incomplete: [],
            inapplicable: [],
        } as AxeResults;
        requestStub = {
            id: testId,
            url: testUrl,
            userData: {},
            errorMessages: [],
        } as any;
        pageStub = {
            url: () => testUrl,
        } as any;

        requestQueueProvider = () => Promise.resolve(requestQueueStub);
        simulatorPageProcessor = new SimulatorPageProcessor(
            accessibilityScanOpMock.object,
            dataStoreMock.object,
            blobStoreMock.object,
            dataBaseMock.object,
            enqueueActiveElementsOpExtMock.object,
            clickElementOpMock.object,
            pageNavigatorMock.object,
            requestQueueProvider,
            crawlerConfigurationMock.object,
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
        accessibilityScanOpMock
            .setup((aso) => aso.run(pageStub, testId, It.isAny()))
            .returns(async () => Promise.resolve(axeResults))
            .verifiable();
        const expectedScanData = {
            id: testId,
            url: testUrl,
            succeeded: true,
            issueCount: 1,
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
        accessibilityScanOpMock.setup((aso) => aso.run(pageStub, testId, It.isAny())).verifiable();
        const expectedScanData = {
            id: testId,
            url: testUrl,
            succeeded: true,
            activatedElement: activeElement,
        };
        blobStoreMock.setup((bs) => bs.setValue(`${expectedScanData.id}.data`, expectedScanData));

        clickElementOpMock
            .setup((cem) => cem.click(pageStub, 'button', requestQueueStub, discoveryPatterns))
            .returns(async () => Promise.resolve({ clickAction: 'page-action' }))
            .verifiable();

        const inputs: Apify.PuppeteerHandlePageInputs = { page: pageStub, request: requestStubClick } as any;
        await simulatorPageProcessor.pageHandler(inputs);
    });

    function setupEnqueueLinks(page: Page): void {
        const options = {
            page: page,
            requestQueue: requestQueueStub,
            pseudoUrls: discoveryPatterns,
        };
        enqueueLinksExtMock
            .setup((el) => el(options))
            .returns(async () => [])
            .verifiable();
    }
});
