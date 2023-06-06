// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page, Browser } from 'puppeteer';
import { BrowserError, PageNavigationHooks } from 'scanner-global-library';
import { IMock, It, Mock, Times } from 'typemoq';
import { System } from 'common';
import * as Crawlee from '@crawlee/puppeteer';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { DataBase } from '../level-storage/data-base';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { BlobStore, DataStore } from '../storage/store-types';
import { ScanData } from '../types/scan-data';
import { ScanResult } from '../level-storage/storage-documents';
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
    let pageNavigationHooksMock: IMock<PageNavigationHooks>;
    let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
    let requestStub: Crawlee.Request;
    let puppeteerPageStub: Page;
    let pageProcessorBase: TestablePageProcessor;
    let browserMock: IMock<Browser>;

    beforeEach(() => {
        accessibilityScanOpMock = Mock.ofType<AccessibilityScanOperation>();
        dataStoreMock = Mock.ofType<DataStore>();
        blobStoreMock = Mock.ofType<BlobStore>();
        dataBaseMock = Mock.ofType<DataBase>();
        saveSnapshotMock = Mock.ofType<typeof Crawlee.puppeteerUtils.saveSnapshot>();
        processPageMock = Mock.ofType<Crawlee.PuppeteerRequestHandler>();
        pageNavigationHooksMock = Mock.ofType<PageNavigationHooks>();
        crawlerConfigurationMock = Mock.ofType(CrawlerConfiguration);
        browserMock = Mock.ofType<Browser>();
        crawlerConfigurationMock
            .setup((o) => o.discoveryPatterns())
            .returns(() => discoveryPatterns)
            .verifiable();
        crawlerConfigurationMock
            .setup((o) => o.snapshot())
            .returns(() => false)
            .verifiable();
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

        pageProcessorBase = new TestablePageProcessor(
            accessibilityScanOpMock.object,
            dataStoreMock.object,
            blobStoreMock.object,
            dataBaseMock.object,
            pageNavigationHooksMock.object,
            crawlerConfigurationMock.object,
            saveSnapshotMock.object,
        );
        pageProcessorBase.processPage = processPageMock.object;
    });

    afterEach(() => {
        blobStoreMock.verifyAll();
        dataStoreMock.verifyAll();
        processPageMock.verifyAll();
        saveSnapshotMock.verifyAll();
        pageNavigationHooksMock.verifyAll();
        dataBaseMock.verifyAll();
        crawlerConfigurationMock.verifyAll();
    });

    it('preNavigation', async () => {
        const context: Crawlee.PuppeteerCrawlingContext = {
            page: puppeteerPageStub,
            request: requestStub,
            response: {},
            session: {
                userData: [],
            },
        } as any;
        const gotoOptions = {};

        pageNavigationHooksMock.setup((o) => o.preNavigation(context.page)).verifiable();

        await pageProcessorBase.preNavigationHook(context, gotoOptions);
        expect(gotoOptions).toEqual({ waitUntil: 'networkidle2' });
    });

    it('postNavigation', async () => {
        pageProcessorBase.baseUrl = testUrl;
        const userAgent = 'userAgent';
        const browserResolution = '1920x1080';
        browserMock
            .setup((o) => o.userAgent())
            .returns(() => Promise.resolve(userAgent))
            .verifiable();
        const context: Crawlee.PuppeteerCrawlingContext = {
            page: puppeteerPageStub,
            request: requestStub,
            response: {} as Response,
        } as any;

        pageNavigationHooksMock.setup(async (o) => o.postNavigation(context.page, It.isAny(), It.isAny())).verifiable();
        dataBaseMock
            .setup((o) => o.addScanMetadata({ baseUrl: testUrl, basePageTitle: 'title', userAgent, browserResolution }))
            .verifiable();

        await pageProcessorBase.postNavigationHook(context, undefined);
    });

    it('postNavigationHook should logs browser errors', async () => {
        pageProcessorBase.baseUrl = testUrl;
        const browserError = {
            errorType: 'HttpErrorCode',
            message: 'message',
            stack: 'stack',
        };
        const context: Crawlee.PuppeteerCrawlingContext = {
            page: puppeteerPageStub,
            request: requestStub,
            session: {
                userData: [],
            },
            response: {},
        } as any;
        pageNavigationHooksMock
            .setup(async (o) => o.postNavigation(context.page, context.response, It.isAny()))
            .returns((page, response, errorCallback) => errorCallback(browserError, undefined))
            .verifiable();
        dataBaseMock
            .setup((o) =>
                o.addScanResult(requestStub.id, {
                    id: requestStub.id,
                    url: requestStub.url,
                    scanState: 'browserError',
                    error: System.serializeError(browserError),
                }),
            )
            .verifiable();

        await pageProcessorBase.postNavigationHook(context, undefined);
        expect(context.session.userData).toContainEqual({ requestId: requestStub.id, browserError: browserError });
    });

    it('handle when postNavigationHook throws errors', async () => {
        const context: Crawlee.PuppeteerCrawlingContext = {
            page: puppeteerPageStub,
            request: requestStub,
            session: {
                userData: [],
            },
        } as any;
        setupScanErrorLogging();

        const browserError = {
            errorType: 'NavigationError',
            message: error.message,
            stack: 'stack',
        } as BrowserError;
        pageNavigationHooksMock
            .setup(async (o) => o.postNavigation(context.page, It.isAny(), It.isAny()))
            .returns((url, page, errorCallback) => errorCallback(browserError, error))
            .verifiable();
        const scanResult = {
            id: requestStub.id as string,
            url: requestStub.url,
            scanState: 'runError',
            error: System.serializeError(error),
        } as ScanResult;
        dataBaseMock.setup((o) => o.addScanResult(testId, scanResult)).verifiable();

        try {
            await pageProcessorBase.postNavigationHook(context, undefined);
            fail('postNavigation() should throw an error');
        } catch (e) {
            expect(e).toEqual(error);
        }
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

        await pageProcessorBase.requestHandler(context);
    });

    it('skip invoking requestHandler when web browser failed to load web page', async () => {
        const context: Crawlee.PuppeteerCrawlingContext = {
            request: {
                id: 'requestId',
            },
            session: {
                userData: [
                    {
                        requestId: 'requestId',
                    },
                ],
            },
        } as any;
        processPageMock.setup((o) => o(context)).verifiable(Times.never());

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

        try {
            await pageProcessorBase.requestHandler(context);
            fail('pageProcessor should have thrown error');
        } catch (err) {
            expect(err).toBe(error);
        }
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
        } as Crawlee.PuppeteerCrawlingContext;
        context.enqueueLinks = jest.fn().mockImplementation(() => Promise.resolve({ unprocessedRequests: [{}] }));
        (pageProcessorBase as any).discoverLinks = true;

        await pageProcessorBase.enqueueLinks(context);
        expect(context.enqueueLinks).toHaveBeenCalledWith({ globs: discoveryPatterns });
    });

    function setupScanErrorLogging(): void {
        blobStoreMock
            .setup((o) => o.setValue(`${testId}.data`, { id: requestStub.id as string, url: requestStub.url, succeeded: false }))
            .verifiable();
        blobStoreMock.setup((o) => o.setValue(`${testId}.err`, `${error.stack}`, { contentType: 'text/plain' })).verifiable();
    }
});
