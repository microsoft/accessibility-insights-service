// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { Logger } from 'logger';
import { DirectNavigationOptions, Page } from 'puppeteer';
import { IMock, Mock } from 'typemoq';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { BlobStore, DataStore } from '../storage/store-types';
import { ScanData } from '../types/scan-data';
import { PageProcessorBase } from './page-processor-base';

// tslint:disable: no-any

describe(PageProcessorBase, () => {
    class TestablePageProcessor extends PageProcessorBase {
        // tslint:disable-next-line: no-empty
        public pageProcessor = async () => {};
    }

    let loggerMock: IMock<Logger>;
    let requestQueueMock: IMock<Apify.RequestQueue>;
    let accessibilityScanOpMock: IMock<AccessibilityScanOperation>;
    let dataStoreMock: IMock<DataStore>;
    let blobStoreMock: IMock<BlobStore>;
    let enqueueLinksExtMock: IMock<typeof Apify.utils.enqueueLinks>;
    let gotoExtendedMock: IMock<typeof Apify.utils.puppeteer.gotoExtended>;

    const discoveryPatterns: string[] = ['pattern1', 'pattern2'];
    const testUrl = 'url';
    let requestStub: Apify.Request;
    let pageStub: Page;

    let pageProcessorBase: TestablePageProcessor;

    beforeEach(() => {
        loggerMock = Mock.ofType<Logger>();
        requestQueueMock = Mock.ofType<Apify.RequestQueue>();
        accessibilityScanOpMock = Mock.ofType<AccessibilityScanOperation>();
        dataStoreMock = Mock.ofType<DataStore>();
        blobStoreMock = Mock.ofType<BlobStore>();
        enqueueLinksExtMock = Mock.ofType<typeof Apify.utils.enqueueLinks>();
        gotoExtendedMock = Mock.ofType<typeof Apify.utils.puppeteer.gotoExtended>();
        requestStub = {
            id: 'id',
            url: testUrl,
            userData: {},
            errorMessages: [],
        } as any;
        pageStub = {
            url: () => testUrl,
        } as any;

        pageProcessorBase = new TestablePageProcessor(
            loggerMock.object,
            requestQueueMock.object,
            discoveryPatterns,
            accessibilityScanOpMock.object,
            dataStoreMock.object,
            blobStoreMock.object,
            enqueueLinksExtMock.object,
            gotoExtendedMock.object,
        );
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

        gotoExtendedMock.verifyAll();
    });

    it('pageErrorProcessor', () => {
        const error = { name: 'error', message: 'error message' };
        const expectedScanData: ScanData = {
            id: requestStub.id as string,
            url: requestStub.url,
            succeeded: false,
            context: requestStub.userData,
            error: JSON.stringify(error),
            requestErrors: requestStub.errorMessages as string[],
        };
        dataStoreMock.setup((ds) => ds.pushData(expectedScanData)).verifiable();

        pageProcessorBase.pageErrorProcessor({ request: requestStub, error });

        dataStoreMock.verifyAll();
    });
});
