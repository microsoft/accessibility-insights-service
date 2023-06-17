// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page } from 'puppeteer';
import { PageNavigator } from 'scanner-global-library';
import { IMock, It, Mock } from 'typemoq';
import { AxeResults } from 'axe-core';
import * as Crawlee from '@crawlee/puppeteer';
import { GlobalLogger } from 'logger';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { DataBase } from '../level-storage/data-base';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { BlobStore, DataStore } from '../storage/store-types';
import { PageNavigatorFactory } from '../types/ioc-types';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { ClassicPageProcessor } from './classic-page-processor';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

describe(ClassicPageProcessor, () => {
    const testUrl = 'test url';
    const testId = 'test id';
    const discoveryPatterns = ['pattern1', 'pattern2'];

    let accessibilityScanOpMock: IMock<AccessibilityScanOperation>;
    let dataStoreMock: IMock<DataStore>;
    let blobStoreMock: IMock<BlobStore>;
    let dataBaseMock: IMock<DataBase>;
    let pageNavigatorMock: IMock<PageNavigator>;
    let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
    let pageNavigatorFactoryMock: IMock<PageNavigatorFactory>;
    let loggerMock: IMock<GlobalLogger>;
    let requestStub: Crawlee.Request;
    let puppeteerPageStub: Page;
    let classicPageProcessor: ClassicPageProcessor;
    let axeResults: AxeResults;

    beforeEach(() => {
        accessibilityScanOpMock = Mock.ofType<AccessibilityScanOperation>();
        dataStoreMock = Mock.ofType<DataStore>();
        blobStoreMock = Mock.ofType<BlobStore>();
        dataBaseMock = Mock.ofType<DataBase>();
        pageNavigatorMock = getPromisableDynamicMock(Mock.ofType<PageNavigator>());
        pageNavigatorFactoryMock = Mock.ofType<PageNavigatorFactory>();
        loggerMock = Mock.ofType<GlobalLogger>();
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
        puppeteerPageStub = {
            url: () => testUrl,
        } as any;
        pageNavigatorMock
            .setup((o) => o.navigate(testUrl, puppeteerPageStub))
            .returns(() => Promise.resolve({}))
            .verifiable();
        pageNavigatorMock.setup((o) => o.logger).returns(() => loggerMock.object);
        pageNavigatorFactoryMock.setup((o) => o(It.isAny())).returns(() => Promise.resolve(pageNavigatorMock.object));

        classicPageProcessor = new ClassicPageProcessor(
            accessibilityScanOpMock.object,
            dataStoreMock.object,
            blobStoreMock.object,
            dataBaseMock.object,
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
        pageNavigatorMock.verifyAll();
        crawlerConfigurationMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('processPage', async () => {
        const expectedScanData = {
            id: testId,
            url: testUrl,
            succeeded: true,
            issueCount: 1,
        };
        const context = { page: puppeteerPageStub, request: requestStub, session: {} } as Crawlee.PuppeteerCrawlingContext;
        accessibilityScanOpMock
            .setup((o) => o.run(puppeteerPageStub, testId, It.isAny()))
            .returns(async () => Promise.resolve(axeResults))
            .verifiable();

        const enqueueLinksFn = jest.fn().mockImplementation(() => Promise.resolve());
        (classicPageProcessor as any).enqueueLinks = enqueueLinksFn;
        const saveSnapshotFn = jest.fn().mockImplementation(() => Promise.resolve());
        (classicPageProcessor as any).saveSnapshot = saveSnapshotFn;
        const pushScanDataFn = jest.fn().mockImplementation(() => Promise.resolve());
        (classicPageProcessor as any).pushScanData = pushScanDataFn;
        const saveScanResultFn = jest.fn().mockImplementation(() => Promise.resolve());
        (classicPageProcessor as any).saveScanResult = saveScanResultFn;
        const saveScanMetadataFn = jest.fn().mockImplementation(() => Promise.resolve());
        (classicPageProcessor as any).saveScanMetadata = saveScanMetadataFn;

        await classicPageProcessor.requestHandler(context);
        expect(enqueueLinksFn).toBeCalledWith(context);
        expect(saveSnapshotFn).toBeCalledWith(context.page, context.request.id);
        expect(pushScanDataFn).toBeCalledWith(expectedScanData);
        expect(saveScanResultFn).toBeCalledWith(context.request, expectedScanData.issueCount);
        expect(saveScanMetadataFn).toBeCalledWith(testUrl, puppeteerPageStub);
    });
});
