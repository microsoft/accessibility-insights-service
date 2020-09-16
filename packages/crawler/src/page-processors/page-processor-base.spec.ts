// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { SummaryScanError } from 'accessibility-insights-report';
import Apify from 'apify';
import { DirectNavigationOptions, Page, Response } from 'puppeteer';
import { BrowserError, PageConfigurator, PageResponseProcessor } from 'scanner-global-library';
import { IMock, It, Mock } from 'typemoq';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { DataBase } from '../level-storage/data-base';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { BlobStore, DataStore } from '../storage/store-types';
import { ApifyRequestQueueProvider } from '../types/ioc-types';
import { ScanData } from '../types/scan-data';
import { PageProcessorBase } from './page-processor-base';

// tslint:disable: no-any no-unsafe-any no-object-literal-type-assertion

describe(PageProcessorBase, () => {
    class TestablePageProcessor extends PageProcessorBase {
        public snapshot: boolean;
        public processPage = async (inputs: Apify.PuppeteerHandlePageInputs) => {
            return;
        };

        public async saveSnapshot(page: Page, id: string): Promise<void> {
            await super.saveSnapshot(page, id);
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

    let requestQueueStub: Apify.RequestQueue;
    let accessibilityScanOpMock: IMock<AccessibilityScanOperation>;
    let dataStoreMock: IMock<DataStore>;
    let blobStoreMock: IMock<BlobStore>;
    let dataBaseMock: IMock<DataBase>;
    let enqueueLinksExtMock: IMock<typeof Apify.utils.enqueueLinks>;
    let gotoExtendedMock: IMock<typeof Apify.utils.puppeteer.gotoExtended>;
    let saveSnapshotMock: IMock<typeof Apify.utils.puppeteer.saveSnapshot>;
    let processPageMock: IMock<Apify.PuppeteerHandlePage>;
    let pageResponseProcessorMock: IMock<PageResponseProcessor>;
    let pageConfiguratorMock: IMock<PageConfigurator>;
    let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
    let requestQueueProvider: ApifyRequestQueueProvider;
    let requestStub: Apify.Request;
    let pageStub: Page;
    let pageProcessorBase: TestablePageProcessor;

    beforeEach(() => {
        requestQueueStub = {} as Apify.RequestQueue;
        accessibilityScanOpMock = Mock.ofType<AccessibilityScanOperation>();
        dataStoreMock = Mock.ofType<DataStore>();
        blobStoreMock = Mock.ofType<BlobStore>();
        dataBaseMock = Mock.ofType<DataBase>();
        enqueueLinksExtMock = Mock.ofType<typeof Apify.utils.enqueueLinks>();
        gotoExtendedMock = Mock.ofType<typeof Apify.utils.puppeteer.gotoExtended>();
        saveSnapshotMock = Mock.ofType<typeof Apify.utils.puppeteer.saveSnapshot>();
        processPageMock = Mock.ofType<Apify.PuppeteerHandlePage>();
        pageResponseProcessorMock = Mock.ofType<PageResponseProcessor>();
        pageConfiguratorMock = Mock.ofType<PageConfigurator>();
        crawlerConfigurationMock = Mock.ofType(CrawlerConfiguration);
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
        } as any;

        pageStub = {
            url: () => testUrl,
            setBypassCSP: (op: boolean) => {
                return;
            },
            title: () => 'title',
        } as any;

        requestQueueProvider = () => Promise.resolve(requestQueueStub);
        pageProcessorBase = new TestablePageProcessor(
            accessibilityScanOpMock.object,
            dataStoreMock.object,
            blobStoreMock.object,
            dataBaseMock.object,
            pageResponseProcessorMock.object,
            pageConfiguratorMock.object,
            requestQueueProvider,
            crawlerConfigurationMock.object,
            enqueueLinksExtMock.object,
            gotoExtendedMock.object,
            saveSnapshotMock.object,
        );
        pageProcessorBase.processPage = processPageMock.object;
    });

    afterEach(() => {
        gotoExtendedMock.verifyAll();
        blobStoreMock.verifyAll();
        dataStoreMock.verifyAll();
        processPageMock.verifyAll();
        saveSnapshotMock.verifyAll();
        pageResponseProcessorMock.verifyAll();
        pageConfiguratorMock.verifyAll();
        dataBaseMock.verifyAll();
        crawlerConfigurationMock.verifyAll();
    });

    it('gotoFunction', async () => {
        const inputs: Apify.PuppeteerGotoInputs = {
            page: pageStub,
            request: requestStub,
        } as any;
        const expectedGotoOptions: DirectNavigationOptions = {
            waitUntil: 'networkidle0',
            timeout: pageProcessorBase.gotoTimeoutSecs * 1000,
        };
        const response = {} as Response;
        pageConfiguratorMock
            .setup(async (o) => o.configurePage(inputs.page))
            .returns(() => Promise.resolve())
            .verifiable();
        pageResponseProcessorMock
            .setup((o) => o.getResponseError(response))
            .returns(() => undefined)
            .verifiable();
        gotoExtendedMock
            .setup(async (gte) => gte(pageStub, requestStub, expectedGotoOptions))
            .returns(() => Promise.resolve(response))
            .verifiable();

        await pageProcessorBase.gotoFunction(inputs);
    });

    it('gotoFunction logs errors', async () => {
        const inputs: Apify.PuppeteerGotoInputs = {
            page: pageStub,
            request: requestStub,
        } as any;
        gotoExtendedMock.setup((gte) => gte(It.isAny(), It.isAny(), It.isAny())).throws(error);
        setupScanErrorLogging();

        const browserError = {
            errorType: 'NavigationError',
            message: error.message,
            stack: 'stack',
        } as BrowserError;
        pageResponseProcessorMock
            .setup((o) => o.getNavigationError(error))
            .returns(() => browserError)
            .verifiable();

        blobStoreMock
            .setup((o) => o.setValue(`${testId}.browser.err`, `${browserError.stack}`, { contentType: 'text/plain' }))
            .verifiable();

        const summaryScanError = {
            url: 'url',
            errorDescription: 'error message',
            errorType: 'NavigationError',
            errorLogLocation: 'key_value_stores/scan-results/id.browser.error.txt',
        } as SummaryScanError;
        dataBaseMock.setup((o) => o.addBrowserError(testId, summaryScanError)).verifiable();

        try {
            await pageProcessorBase.gotoFunction(inputs);
            fail('gotoFunction should have thrown an error');
        } catch (err) {
            expect(err).toBe(error);
        }
    });

    it('gotoFunction logs page response errors', async () => {
        const response = {} as Response;
        const inputs: Apify.PuppeteerGotoInputs = {
            page: pageStub,
            request: requestStub,
        } as any;

        gotoExtendedMock
            .setup(async (gte) => gte(pageStub, requestStub, It.isAny()))
            .returns(() => Promise.resolve(response))
            .verifiable();

        const responseError = {
            errorType: 'InvalidContentType',
            message: 'Content type: text/plain',
            stack: 'stack',
        } as BrowserError;
        pageResponseProcessorMock
            .setup((o) => o.getResponseError(response))
            .returns(() => responseError)
            .verifiable();

        blobStoreMock
            .setup((o) => o.setValue(`${testId}.browser.err`, `${responseError.stack}`, { contentType: 'text/plain' }))
            .verifiable();

        const summaryScanError = {
            url: 'url',
            errorDescription: 'Content type: text/plain',
            errorType: 'InvalidContentType',
            errorLogLocation: 'key_value_stores/scan-results/id.browser.error.txt',
        } as SummaryScanError;
        dataBaseMock.setup((o) => o.addBrowserError(testId, summaryScanError)).verifiable();

        const expectedError = new Error(`Page response error: ${JSON.stringify(responseError)}`);

        try {
            await pageProcessorBase.gotoFunction(inputs);
            fail('gotoFunction should have thrown an error');
        } catch (err) {
            expect(err).toEqual(expectedError);
        }
    });

    it('pageErrorProcessor', () => {
        const expectedScanData: ScanData = {
            id: requestStub.id as string,
            url: requestStub.url,
            succeeded: false,
            context: requestStub.userData,
            error: JSON.stringify(error),
            requestErrors: requestStub.errorMessages as string[],
            issueCount: 0,
        };
        dataStoreMock.setup((ds) => ds.pushData(expectedScanData)).verifiable();
        setupScanErrorLogging();

        pageProcessorBase.pageErrorProcessor({ request: requestStub, error });
    });

    it('pageProcessor', async () => {
        const inputs: Apify.PuppeteerHandlePageInputs = {
            page: pageStub,
            request: requestStub,
        } as any;
        processPageMock.setup((pp) => pp(inputs)).verifiable();

        await pageProcessorBase.pageHandler(inputs);
    });

    it('pageProcessor logs errors', async () => {
        const inputs: Apify.PuppeteerHandlePageInputs = {
            page: pageStub,
            request: requestStub,
        } as any;
        processPageMock
            .setup((pp) => pp(inputs))
            .throws(error)
            .verifiable();
        setupScanErrorLogging();

        try {
            await pageProcessorBase.pageHandler(inputs);
            fail('pageProcessor should have thrown error');
        } catch (err) {
            expect(err).toBe(error);
        }
    });

    it('saveSnapshot', async () => {
        setupSaveSnapshot();
        pageProcessorBase.snapshot = true;

        pageProcessorBase.processPage = processPageMock.object;
        await pageProcessorBase.saveSnapshot(pageStub, testId);
    });

    function setupSaveSnapshot(): void {
        saveSnapshotMock.reset();
        saveSnapshotMock
            .setup((ssm) =>
                ssm(pageStub, {
                    key: `${testId}.screenshot`,
                    saveHtml: false,
                    keyValueStoreName: 'scan-results',
                }),
            )
            .verifiable();
    }

    function setupScanErrorLogging(): void {
        blobStoreMock
            .setup((bs) => bs.setValue(`${testId}.data`, { id: requestStub.id as string, url: requestStub.url, succeeded: false }))
            .verifiable();
        blobStoreMock.setup((bs) => bs.setValue(`${testId}.err`, `${error.stack}`, { contentType: 'text/plain' })).verifiable();
    }
});
