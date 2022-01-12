// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import Apify from 'apify';
import { Page } from 'puppeteer';
import { NavigationHooks } from 'scanner-global-library';
import { IMock, It, Mock } from 'typemoq';
import { AxeResults } from 'axe-core';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { DataBase } from '../level-storage/data-base';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { BlobStore, DataStore } from '../storage/store-types';
import { ApifyRequestQueueProvider } from '../types/ioc-types';
import { ApifySdkWrapper } from '../apify/apify-sdk-wrapper';
import { ClassicPageProcessor } from './classic-page-processor';
import { PartialScanData, PuppeteerHandlePageInputs } from './page-processor-base';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

describe(ClassicPageProcessor, () => {
    const testUrl = 'test url';
    const testId = 'test id';
    const discoveryPatterns = ['pattern1', 'pattern2'];

    let requestQueueStub: Apify.RequestQueue;
    let accessibilityScanOpMock: IMock<AccessibilityScanOperation>;
    let dataStoreMock: IMock<DataStore>;
    let blobStoreMock: IMock<BlobStore>;
    let dataBaseMock: IMock<DataBase>;
    let apifyWrapperMock: IMock<ApifySdkWrapper>;
    let navigationHooks: IMock<NavigationHooks>;
    let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
    let requestStub: Apify.Request;
    let pageStub: Page;
    let classicPageProcessor: ClassicPageProcessor;
    let requestQueueProvider: ApifyRequestQueueProvider;
    let axeResults: AxeResults;

    beforeEach(() => {
        requestQueueStub = {} as Apify.RequestQueue;
        accessibilityScanOpMock = Mock.ofType<AccessibilityScanOperation>();
        dataStoreMock = Mock.ofType<DataStore>();
        blobStoreMock = Mock.ofType<BlobStore>();
        dataBaseMock = Mock.ofType<DataBase>();
        apifyWrapperMock = Mock.ofType<ApifySdkWrapper>();
        navigationHooks = Mock.ofType<NavigationHooks>();
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
        classicPageProcessor = new ClassicPageProcessor(
            accessibilityScanOpMock.object,
            dataStoreMock.object,
            blobStoreMock.object,
            dataBaseMock.object,
            navigationHooks.object,
            requestQueueProvider,
            crawlerConfigurationMock.object,
            apifyWrapperMock.object,
        );
    });

    afterEach(() => {
        apifyWrapperMock.verifyAll();
        accessibilityScanOpMock.verifyAll();
        blobStoreMock.verifyAll();
    });

    it('pageProcessor', async () => {
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
        setupPushScanData(expectedScanData);

        const inputs: PuppeteerHandlePageInputs = { page: pageStub, request: requestStub } as any;
        await classicPageProcessor.pageHandler(inputs);
    });

    function setupEnqueueLinks(page: Page): void {
        const options = {
            page: pageStub,
            requestQueue: requestQueueStub,
            pseudoUrls: discoveryPatterns,
        };
        apifyWrapperMock
            .setup((a) => a.enqueueLinks(options))
            .returns(async () => [])
            .verifiable();
    }

    function setupPushScanData(expectedScanData: PartialScanData): void {
        const id = `${expectedScanData.id}.data`;
        blobStoreMock.setup((bs) => bs.setValue(id, expectedScanData)).verifiable();
    }
});
