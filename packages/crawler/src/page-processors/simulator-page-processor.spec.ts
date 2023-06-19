// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Crawlee from '@crawlee/puppeteer';
import { Page } from 'puppeteer';
import { PageNavigator } from 'scanner-global-library';
import { IMock, It, Mock } from 'typemoq';
import { AxeResults } from 'axe-core';
import { GlobalLogger } from 'logger';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { DataBase } from '../level-storage/data-base';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { ClickElementOperation } from '../page-operations/click-element-operation';
import { EnqueueActiveElementsOperation } from '../page-operations/enqueue-active-elements-operation';
import { BlobStore, DataStore } from '../storage/store-types';
import { PageNavigatorFactory } from '../types/ioc-types';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { SimulatorPageProcessor } from './simulator-page-processor';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions,  */

describe(SimulatorPageProcessor, () => {
    const testUrl = 'test url';
    const testId = 'test id';
    const discoveryPatterns = ['pattern1', 'pattern2'];
    const selectors = ['button'];

    let accessibilityScanOpMock: IMock<AccessibilityScanOperation>;
    let dataStoreMock: IMock<DataStore>;
    let blobStoreMock: IMock<BlobStore>;
    let dataBaseMock: IMock<DataBase>;
    let clickElementOpMock: IMock<ClickElementOperation>;
    let enqueueActiveElementsOpExtMock: IMock<EnqueueActiveElementsOperation>;
    let pageNavigatorMock: IMock<PageNavigator>;
    let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
    let pageNavigatorFactoryMock: IMock<PageNavigatorFactory>;
    let loggerMock: IMock<GlobalLogger>;
    let requestStub: Crawlee.Request;
    let puppeteerPageStub: Page;
    let simulatorPageProcessor: SimulatorPageProcessor;
    let axeResults: AxeResults;

    beforeEach(() => {
        accessibilityScanOpMock = Mock.ofType<AccessibilityScanOperation>();
        dataStoreMock = Mock.ofType<DataStore>();
        blobStoreMock = Mock.ofType<BlobStore>();
        dataBaseMock = Mock.ofType<DataBase>();
        clickElementOpMock = Mock.ofType<ClickElementOperation>();
        enqueueActiveElementsOpExtMock = Mock.ofType<EnqueueActiveElementsOperation>();
        pageNavigatorMock = getPromisableDynamicMock(Mock.ofType<PageNavigator>());
        loggerMock = Mock.ofType<GlobalLogger>();
        pageNavigatorFactoryMock = Mock.ofType<PageNavigatorFactory>();
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
        } as Crawlee.Request;
        puppeteerPageStub = {
            url: () => testUrl,
        } as Page;
        pageNavigatorMock
            .setup((o) => o.navigate(testUrl, puppeteerPageStub))
            .returns(() => Promise.resolve({}))
            .verifiable();
        pageNavigatorMock.setup((o) => o.logger).returns(() => loggerMock.object);
        pageNavigatorFactoryMock.setup((o) => o(It.isAny())).returns(() => Promise.resolve(pageNavigatorMock.object));

        simulatorPageProcessor = new SimulatorPageProcessor(
            accessibilityScanOpMock.object,
            dataStoreMock.object,
            blobStoreMock.object,
            dataBaseMock.object,
            enqueueActiveElementsOpExtMock.object,
            clickElementOpMock.object,
            crawlerConfigurationMock.object,
            pageNavigatorFactoryMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        accessibilityScanOpMock.verifyAll();
        dataStoreMock.verifyAll();
        blobStoreMock.verifyAll();
        dataBaseMock.verifyAll();
        enqueueActiveElementsOpExtMock.verifyAll();
        clickElementOpMock.verifyAll();
        pageNavigatorMock.verifyAll();
        crawlerConfigurationMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('pageProcessor, no-op', async () => {
        const context = {
            page: puppeteerPageStub,
            request: requestStub,
            session: { userData: [] } as any,
        } as Crawlee.PuppeteerCrawlingContext;
        const expectedScanData = {
            id: testId,
            url: testUrl,
            succeeded: true,
            issueCount: 1,
        };
        accessibilityScanOpMock
            .setup((o) => o.run(puppeteerPageStub, testId, It.isAny()))
            .returns(async () => Promise.resolve(axeResults))
            .verifiable();
        enqueueActiveElementsOpExtMock
            .setup((o) => o.enqueue(context, selectors))
            .returns(() => Promise.resolve())
            .verifiable();
        const enqueueLinksFn = jest.fn().mockImplementation(() => Promise.resolve());
        (simulatorPageProcessor as any).enqueueLinks = enqueueLinksFn;
        const saveSnapshotFn = jest.fn().mockImplementation(() => Promise.resolve());
        (simulatorPageProcessor as any).saveSnapshot = saveSnapshotFn;
        const pushScanDataFn = jest.fn().mockImplementation(() => Promise.resolve());
        (simulatorPageProcessor as any).pushScanData = pushScanDataFn;
        const saveScanResultFn = jest.fn().mockImplementation(() => Promise.resolve());
        (simulatorPageProcessor as any).saveScanResult = saveScanResultFn;
        const saveScanMetadataFn = jest.fn().mockImplementation(() => Promise.resolve());
        (simulatorPageProcessor as any).saveScanMetadata = saveScanMetadataFn;

        await simulatorPageProcessor.requestHandler(context);
        expect(enqueueLinksFn).toBeCalledWith(context);
        expect(saveSnapshotFn).toBeCalledWith(context.page, context.request.id);
        expect(pushScanDataFn).toBeCalledWith(expectedScanData);
        expect(saveScanResultFn).toBeCalledWith(context.request, expectedScanData.issueCount);
        expect(saveScanMetadataFn).toBeCalledWith(testUrl, puppeteerPageStub);
    });

    it('pageProcessor, click', async () => {
        const activeElement = { html: 'html', selector: 'button', clickAction: 'page-action' };
        const requestStubClick = {
            id: testId,
            url: testUrl,
            userData: { operationType: 'click', data: activeElement },
        } as any;
        const context = {
            page: puppeteerPageStub,
            request: requestStubClick,
            session: { userData: [] } as any,
        } as Crawlee.PuppeteerCrawlingContext;
        const expectedScanData = {
            id: testId,
            url: testUrl,
            succeeded: true,
            issueCount: 1,
            activatedElement: activeElement,
        };
        clickElementOpMock
            .setup((o) => o.click(context, 'button', discoveryPatterns))
            .returns(async () => Promise.resolve({ clickAction: 'page-action' }))
            .verifiable();
        accessibilityScanOpMock
            .setup((o) => o.run(puppeteerPageStub, testId, It.isAny()))
            .returns(async () => Promise.resolve(axeResults))
            .verifiable();
        const enqueueLinksFn = jest.fn().mockImplementation(() => Promise.resolve());
        (simulatorPageProcessor as any).enqueueLinks = enqueueLinksFn;
        const saveSnapshotFn = jest.fn().mockImplementation(() => Promise.resolve());
        (simulatorPageProcessor as any).saveSnapshot = saveSnapshotFn;
        const pushScanDataFn = jest.fn().mockImplementation(() => Promise.resolve());
        (simulatorPageProcessor as any).pushScanData = pushScanDataFn;
        const saveScanResultFn = jest.fn().mockImplementation(() => Promise.resolve());
        (simulatorPageProcessor as any).saveScanResult = saveScanResultFn;
        const saveScanMetadataFn = jest.fn().mockImplementation(() => Promise.resolve());
        (simulatorPageProcessor as any).saveScanMetadata = saveScanMetadataFn;

        await simulatorPageProcessor.requestHandler(context);
        expect(enqueueLinksFn).toBeCalledWith(context);
        expect(saveSnapshotFn).toBeCalledWith(context.page, context.request.id);
        expect(pushScanDataFn).toBeCalledWith(expectedScanData);
        expect(saveScanResultFn).toBeCalledWith(context.request, expectedScanData.issueCount, activeElement.selector);
        expect(saveScanMetadataFn).toBeCalledWith(testUrl, puppeteerPageStub);
    });
});
