// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page, Browser } from 'puppeteer';
import { IMock, Mock, Times } from 'typemoq';
import * as Crawlee from '@crawlee/puppeteer';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { DataBase } from '../level-storage/data-base';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { BlobStore, DataStore } from '../storage/store-types';
import { ScanData } from '../types/scan-data';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { NavigationResponse, PageNavigator } from '../page-handler/page-navigator';
import { Logger } from '../logger/logger';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { System } from '../common/system';
import { PageProcessorBase } from './page-processor-base';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

describe(PageProcessorBase, () => {
    class TestablePageProcessor extends PageProcessorBase {
        public snapshot: boolean;

        public baseUrl: string;

        public processPage: Crawlee.PuppeteerRequestHandler = async () => {
            return;
        };

        public async saveSnapshot(page: Page, id: string): Promise<void> {
            await super.saveSnapshot(page, id);
        }

        public async enqueueLinks(context: Crawlee.PuppeteerCrawlingContext): Promise<void> {
            await super.enqueueLinks(context);
        }
    }

    const discoveryPatterns: string[] = ['pattern1', 'pattern2'];
    const testUrl = 'url';
    const testId = 'id';
    const error: Error = {
        name: 'error',
        message: 'error message',
        stack: 'stack',
    };

    let accessibilityScanOpMock: IMock<AccessibilityScanOperation>;
    let dataStoreMock: IMock<DataStore>;
    let blobStoreMock: IMock<BlobStore>;
    let dataBaseMock: IMock<DataBase>;
    let saveSnapshotMock: IMock<typeof Crawlee.puppeteerUtils.saveSnapshot>;
    let processPageMock: IMock<Crawlee.PuppeteerRequestHandler>;
    let pageNavigatorMock: IMock<PageNavigator>;
    let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
    let requestStub: Crawlee.Request;
    let puppeteerPageStub: Page;
    let pageProcessorBase: TestablePageProcessor;
    let browserMock: IMock<Browser>;
    let loggerMock: IMock<Logger>;

    beforeEach(() => {
        accessibilityScanOpMock = Mock.ofType<AccessibilityScanOperation>();
        dataStoreMock = Mock.ofType<DataStore>();
        blobStoreMock = Mock.ofType<BlobStore>();
        dataBaseMock = Mock.ofType<DataBase>();
        saveSnapshotMock = Mock.ofType<typeof Crawlee.puppeteerUtils.saveSnapshot>();
        processPageMock = Mock.ofType<Crawlee.PuppeteerRequestHandler>();
        pageNavigatorMock = getPromisableDynamicMock(Mock.ofType<PageNavigator>());
        crawlerConfigurationMock = Mock.ofType(CrawlerConfiguration);
        browserMock = Mock.ofType<Browser>();
        loggerMock = Mock.ofType<Logger>();
        crawlerConfigurationMock
            .setup((o) => o.discoveryPatterns())
            .returns(() => discoveryPatterns)
            .verifiable();
        crawlerConfigurationMock
            .setup((o) => o.snapshot())
            .returns(() => false)
            .verifiable();
        crawlerConfigurationMock
            .setup((o) => o.crawlerRunOptions)
            .returns(() => {
                return {} as CrawlerRunOptions;
            });
        requestStub = {
            id: testId,
            url: testUrl,
            userData: {},
            errorMessages: [],
        } as Crawlee.Request;
        puppeteerPageStub = {
            browser: () => browserMock.object,
            url: () => testUrl,
            setBypassCSP: (op: boolean) => {
                return;
            },
            title: () => 'title',
            evaluate: async () =>
                Promise.resolve({
                    width: 1920,
                    height: 1080,
                }),
        } as any;
        pageNavigatorMock.setup((o) => o.logger).returns(() => loggerMock.object);

        pageProcessorBase = new TestablePageProcessor(
            accessibilityScanOpMock.object,
            dataStoreMock.object,
            blobStoreMock.object,
            dataBaseMock.object,
            crawlerConfigurationMock.object,
            pageNavigatorMock.object,
            loggerMock.object,
            saveSnapshotMock.object,
        );
        pageProcessorBase.processPage = processPageMock.object;
    });

    afterEach(() => {
        blobStoreMock.verifyAll();
        dataStoreMock.verifyAll();
        processPageMock.verifyAll();
        saveSnapshotMock.verifyAll();
        pageNavigatorMock.verifyAll();
        dataBaseMock.verifyAll();
        crawlerConfigurationMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('failedRequestHandler', async () => {
        const expectedScanData: ScanData = {
            id: requestStub.id as string,
            url: requestStub.url,
            succeeded: false,
            context: requestStub.userData,
            error: System.serializeError(error),
            requestErrors: requestStub.errorMessages as string[],
            issueCount: 0,
        };
        dataStoreMock.setup((o) => o.pushData(expectedScanData)).verifiable();
        setupScanErrorLogging();
        const context = { request: requestStub } as Crawlee.PuppeteerCrawlingContext;

        await pageProcessorBase.failedRequestHandler(context, error);
    });

    it('requestHandler', async () => {
        const context: Crawlee.PuppeteerCrawlingContext = {
            page: puppeteerPageStub,
            request: requestStub,
            session: {
                userData: [],
            },
        } as any;
        processPageMock.setup((o) => o(context)).verifiable();
        pageNavigatorMock
            .setup((o) => o.navigate(testUrl, puppeteerPageStub))
            .returns(() => Promise.resolve({}))
            .verifiable();
        const saveScanMetadataFn = jest.fn().mockImplementation(() => Promise.resolve());
        (pageProcessorBase as any).saveScanMetadata = saveScanMetadataFn;

        await pageProcessorBase.requestHandler(context);
        expect(saveScanMetadataFn).toBeCalledWith(testUrl, puppeteerPageStub);
    });

    it('requestHandler should logs browser error', async () => {
        const context: Crawlee.PuppeteerCrawlingContext = {
            page: puppeteerPageStub,
            request: requestStub,
            session: {
                userData: [],
            },
        } as any;
        const response = { browserError: {} } as NavigationResponse;
        processPageMock.setup((o) => o(context)).verifiable(Times.never());
        pageNavigatorMock
            .setup((o) => o.navigate(testUrl, puppeteerPageStub))
            .returns(() => Promise.resolve(response))
            .verifiable();
        const saveBrowserErrorFn = jest.fn().mockImplementation(() => Promise.resolve());
        (pageProcessorBase as any).saveBrowserError = saveBrowserErrorFn;

        await pageProcessorBase.requestHandler(context);
    });

    it('requestHandler should logs errors', async () => {
        const context: Crawlee.PuppeteerCrawlingContext = {
            page: puppeteerPageStub,
            request: requestStub,
            session: {
                userData: [],
            },
        } as any;
        processPageMock
            .setup((o) => o(context))
            .throws(error)
            .verifiable();
        setupScanErrorLogging();
        pageNavigatorMock
            .setup((o) => o.navigate(testUrl, puppeteerPageStub))
            .returns(() => Promise.resolve({}))
            .verifiable();
        const saveScanMetadataFn = jest.fn().mockImplementation(() => Promise.resolve());
        (pageProcessorBase as any).saveScanMetadata = saveScanMetadataFn;

        try {
            await pageProcessorBase.requestHandler(context);
            fail('pageProcessor should have thrown error');
        } catch (err) {
            expect(err).toBe(error);
        }
        expect(saveScanMetadataFn).toBeCalledWith(testUrl, puppeteerPageStub);
    });

    it('saveSnapshot', async () => {
        saveSnapshotMock.reset();
        saveSnapshotMock
            .setup((o) =>
                o(puppeteerPageStub, {
                    key: `${testId}.screenshot`,
                    saveHtml: false,
                    keyValueStoreName: 'scan-results',
                }),
            )
            .verifiable();
        pageProcessorBase.snapshot = true;

        pageProcessorBase.processPage = processPageMock.object;
        await pageProcessorBase.saveSnapshot(puppeteerPageStub, testId);
    });

    it('enqueueLinks', async () => {
        const context = {
            page: {
                url: () => 'url',
            },
            request: {
                loadedUrl: undefined,
            },
        } as Crawlee.PuppeteerCrawlingContext;
        context.request.userData = {
            keepUrlFragment: undefined,
        };
        context.enqueueLinks = jest.fn().mockImplementation(() => Promise.resolve({ processedRequests: [{}] }));
        (pageProcessorBase as any).discoverLinks = true;

        const discoveryPatternsRegEx = discoveryPatterns.map((p) => new RegExp(p));
        await pageProcessorBase.enqueueLinks(context);
        expect(context.enqueueLinks).toHaveBeenCalledWith({
            regexps: discoveryPatternsRegEx,
            transformRequestFunction: expect.any(Function),
        });
        const enqueueLinksArgs = (context.enqueueLinks as any).mock?.calls[0][0];
        // Assert the value of request.keepUrlFragment
        expect(enqueueLinksArgs.transformRequestFunction({}).keepUrlFragment).toBe(false);
        expect(context.request.loadedUrl).toEqual('url');
    });

    it('enqueueLinks to keep hash fragments', async () => {
        const context = {
            page: {
                url: () => 'url',
            },
            request: {
                loadedUrl: undefined,
            },
        } as Crawlee.PuppeteerCrawlingContext;
        context.request.userData = {
            keepUrlFragment: true,
        };
        context.enqueueLinks = jest.fn().mockImplementation(() => Promise.resolve({ processedRequests: [{}] }));
        (pageProcessorBase as any).discoverLinks = true;

        const discoveryPatternsRegEx = discoveryPatterns.map((p) => new RegExp(p));
        await pageProcessorBase.enqueueLinks(context);

        expect(context.enqueueLinks).toHaveBeenCalledWith({
            regexps: discoveryPatternsRegEx,
            transformRequestFunction: expect.any(Function),
        });

        const enqueueLinksArgs = (context.enqueueLinks as any).mock?.calls[0][0];

        // Assert the value of request.keepUrlFragment
        expect(enqueueLinksArgs.transformRequestFunction({}).keepUrlFragment).toBe(true);
        expect(context.enqueueLinks).toHaveBeenCalledWith({ regexps: discoveryPatternsRegEx });
        expect(context.request.loadedUrl).toEqual('url');
    });

    function setupScanErrorLogging(): void {
        blobStoreMock
            .setup((o) => o.setValue(`${testId}.data`, { id: requestStub.id as string, url: requestStub.url, succeeded: false }))
            .verifiable();
        blobStoreMock.setup((o) => o.setValue(`${testId}.err`, `${error.stack}`, { contentType: 'text/plain' })).verifiable();
    }
});
