// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import Apify from 'apify';
import { DirectNavigationOptions, Page } from 'puppeteer';
import { IMock, It, Mock } from 'typemoq';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { BlobStore, DataStore } from '../storage/store-types';
import { ScanData } from '../types/scan-data';
import { PageProcessorBase } from './page-processor-base';

// tslint:disable: no-any no-unsafe-any

describe(PageProcessorBase, () => {
    class TestablePageProcessor extends PageProcessorBase {
        public processPage = async (inputs: Apify.PuppeteerHandlePageInputs) => {
            return;
        };
    }

    let requestQueueMock: IMock<Apify.RequestQueue>;
    let accessibilityScanOpMock: IMock<AccessibilityScanOperation>;
    let dataStoreMock: IMock<DataStore>;
    let blobStoreMock: IMock<BlobStore>;
    let enqueueLinksExtMock: IMock<typeof Apify.utils.enqueueLinks>;
    let gotoExtendedMock: IMock<typeof Apify.utils.puppeteer.gotoExtended>;
    let saveSnapshotMock: IMock<typeof Apify.utils.puppeteer.saveSnapshot>;
    let processPageMock: IMock<Apify.PuppeteerHandlePage>;

    const discoveryPatterns: string[] = ['pattern1', 'pattern2'];
    const testUrl = 'url';
    const testId = 'id';
    let requestStub: Apify.Request;
    let pageStub: Page;
    const error: Error = {
        name: 'error',
        message: 'error message',
        stack: 'stack',
    };

    let pageProcessorBase: PageProcessorBase;

    beforeEach(() => {
        requestQueueMock = Mock.ofType<Apify.RequestQueue>();
        accessibilityScanOpMock = Mock.ofType<AccessibilityScanOperation>();
        dataStoreMock = Mock.ofType<DataStore>();
        blobStoreMock = Mock.ofType<BlobStore>();
        enqueueLinksExtMock = Mock.ofType<typeof Apify.utils.enqueueLinks>();
        gotoExtendedMock = Mock.ofType<typeof Apify.utils.puppeteer.gotoExtended>();
        saveSnapshotMock = Mock.ofType<typeof Apify.utils.puppeteer.saveSnapshot>();
        processPageMock = Mock.ofType<Apify.PuppeteerHandlePage>();
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
        } as any;

        pageProcessorBase = new TestablePageProcessor(
            accessibilityScanOpMock.object,
            dataStoreMock.object,
            blobStoreMock.object,
            requestQueueMock.object,
            false,
            discoveryPatterns,
            enqueueLinksExtMock.object,
            gotoExtendedMock.object,
            saveSnapshotMock.object,
        );
        (pageProcessorBase as TestablePageProcessor).processPage = processPageMock.object;
    });

    afterEach(() => {
        gotoExtendedMock.verifyAll();
        blobStoreMock.verifyAll();
        dataStoreMock.verifyAll();
        processPageMock.verifyAll();
        saveSnapshotMock.verifyAll();
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

        gotoExtendedMock.setup((gte) => gte(pageStub, requestStub, expectedGotoOptions)).verifiable();

        await pageProcessorBase.gotoFunction(inputs);
    });

    it('gotoFunction logs errors', async () => {
        const inputs: Apify.PuppeteerGotoInputs = {
            page: pageStub,
            request: requestStub,
        } as any;
        gotoExtendedMock.setup((gte) => gte(It.isAny(), It.isAny(), It.isAny())).throws(error);
        setupScanErrorLogging();

        try {
            await pageProcessorBase.gotoFunction(inputs);
            fail('gotoFunction should have thrown an error');
        } catch (err) {
            expect(err).toBe(error);
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
        pageProcessorBase = new TestablePageProcessor(
            accessibilityScanOpMock.object,
            dataStoreMock.object,
            blobStoreMock.object,
            requestQueueMock.object,
            true,
            discoveryPatterns,
            enqueueLinksExtMock.object,
            gotoExtendedMock.object,
            saveSnapshotMock.object,
        );
        (pageProcessorBase as TestablePageProcessor).processPage = processPageMock.object;
        await pageProcessorBase.saveSnapshot(pageStub, testId);
    });

    function setupSaveSnapshot(): void {
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
