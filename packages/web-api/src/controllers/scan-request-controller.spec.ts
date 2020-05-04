// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { GuidGenerator, RestApiConfig, ServiceConfiguration } from 'common';
import { BatchScanRequestMeasurements } from 'logger';
import * as MockDate from 'mockdate';
import {
    HttpResponse,
    OnDemandPageScanRunResultProvider,
    PageScanRequestProvider,
    PartitionKeyFactory,
    ScanRunResponse,
    WebApiErrorCodes,
} from 'service-library';
import { ItemType, OnDemandPageScanRequest, OnDemandPageScanResult } from 'storage-documents';
import { IMock, It, Mock, MockBehavior } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';

import { ScanRequestController } from './scan-request-controller';

// tslint:disable: no-unsafe-any no-object-literal-type-assertion

interface DataItem {
    url: string;
}

describe(ScanRequestController, () => {
    let scanRequestController: ScanRequestController;
    let context: Context;
    let pageScanRequestProviderMock: IMock<PageScanRequestProvider>;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let partitionKeyFactoryMock: IMock<PartitionKeyFactory>;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<MockableLogger>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let dateNow: Date;

    beforeEach(() => {
        dateNow = new Date(2020, 7, 1);
        MockDate.set(dateNow);

        context = <Context>(<unknown>{
            req: {
                method: 'POST',
                rawBody: `{ url: 'https://abc/path/' }`,
                headers: {},
                query: {},
            },
        });
        context.req.query['api-version'] = '1.0';
        context.req.headers['content-type'] = 'application/json';

        pageScanRequestProviderMock = Mock.ofType<PageScanRequestProvider>(PageScanRequestProvider, MockBehavior.Strict);
        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>(
            OnDemandPageScanRunResultProvider,
            MockBehavior.Strict,
        );
        partitionKeyFactoryMock = Mock.ofType<PartitionKeyFactory>();

        guidGeneratorMock = Mock.ofType(GuidGenerator);

        partitionKeyFactoryMock
            .setup((p) => p.createPartitionKeyForDocument(ItemType.onDemandPageScanRunResult, It.isAny()))
            .returns((docType, id) => `pk-${id}`);

        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();
        serviceConfigurationMock
            .setup(async (s) => s.getConfigValue('restApiConfig'))
            .returns(async () => {
                return {
                    maxScanRequestBatchCount: 3,
                    minScanPriorityValue: -10,
                    maxScanPriorityValue: 10,
                } as RestApiConfig;
            });

        loggerMock = Mock.ofType<MockableLogger>();
    });

    afterEach(() => {
        partitionKeyFactoryMock.verifyAll();
        onDemandPageScanRunResultProviderMock.verifyAll();
        partitionKeyFactoryMock.verifyAll();
        loggerMock.verifyAll();
        MockDate.reset();
    });

    function createScanRequestController(contextReq: Context): ScanRequestController {
        const controller = new ScanRequestController(
            pageScanRequestProviderMock.object,
            onDemandPageScanRunResultProviderMock.object,
            partitionKeyFactoryMock.object,
            guidGeneratorMock.object,
            serviceConfigurationMock.object,
            loggerMock.object,
        );
        controller.context = contextReq;

        return controller;
    }

    function sortData<T extends DataItem>(array: T[]): T[] {
        return array.sort((a, b) => (a.url > b.url ? 1 : b.url > a.url ? -1 : 0));
    }

    describe(ScanRequestController, () => {
        it('rejects request with large payload', async () => {
            context.req.rawBody = JSON.stringify([{ url: '' }, { url: '' }, { url: '' }, { url: '' }]);
            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.requestBodyTooLarge));
        });

        it('rejects request invalid scan notify url', async () => {
            context.req.rawBody = JSON.stringify([{ url: 'https://abs/path/', scanNotifyUrl: 'invalid-url' }]);
            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            expect(context.res.body[0].error).toEqual(WebApiErrorCodes.invalidScanNotifyUrl.error);
        });

        test.each([
            {
                request: { url: '/invalid/url' },
                response: { url: '/invalid/url', error: WebApiErrorCodes.invalidURL.error },
            },
            {
                request: { url: 'https://cde/path/', priority: 9999 },
                response: { url: 'https://cde/path/', error: WebApiErrorCodes.outOfRangePriority.error },
            },
        ])('accepts valid request only %o', async (testCase) => {
            const batchGuid = '1e9cefa6-538a-6df0-aaaa-ffffffffffff';
            const scanGuid = '1e9cefa6-538a-6df0-bbbb-ffffffffffff';
            guidGeneratorMock.setup((g) => g.createGuid()).returns(() => batchGuid);
            guidGeneratorMock.setup((g) => g.createGuidFromBaseGuid(batchGuid)).returns(() => scanGuid);

            context.req.rawBody = JSON.stringify([testCase.request]);
            const expectedResponse = [testCase.response];

            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            const expectedMeasurements: BatchScanRequestMeasurements = {
                totalScanRequests: 1,
                acceptedScanRequests: 0,
                rejectedScanRequests: 1,
            };

            // tslint:disable-next-line: no-null-keyword
            loggerMock.setup((lm) => lm.trackEvent('BatchScanRequestSubmitted', null, expectedMeasurements)).verifiable();

            // normalize random result order
            const expectedResponseSorted = sortData(expectedResponse);
            const responseSorted = sortData(<ScanRunResponse[]>(<unknown>context.res.body));

            expect(context.res.status).toEqual(202);
            expect(responseSorted).toEqual(expectedResponseSorted);
        });

        it('accepts request with priority', async () => {
            const batchGuid = '1e9cefa6-538a-6df0-aaaa-ffffffffffff';
            const scanGuid = '1e9cefa6-538a-6df0-bbbb-ffffffffffff';
            const priority = 10;
            const url = 'https://abs/path/';

            guidGeneratorMock.setup((g) => g.createGuid()).returns(() => batchGuid);
            guidGeneratorMock.setup((g) => g.createGuidFromBaseGuid(batchGuid)).returns(() => scanGuid);

            context.req.rawBody = JSON.stringify([{ url: url, priority: priority }]);
            const expectedResponse = [{ scanId: scanGuid, url: url }];

            const expectedMeasurements: BatchScanRequestMeasurements = {
                totalScanRequests: 1,
                acceptedScanRequests: 1,
                rejectedScanRequests: 0,
            };

            // tslint:disable-next-line: no-null-keyword
            loggerMock.setup((lm) => lm.trackEvent('BatchScanRequestSubmitted', null, expectedMeasurements)).verifiable();

            const expectedPageScanResults = [getOnDemandScanBatchResultDocument(scanGuid, batchGuid, url, priority)];
            onDemandPageScanRunResultProviderMock
                .setup((o) => o.writeScanRuns(expectedPageScanResults))
                .returns(() => Promise.resolve())
                .verifiable();

            const expectedPageScanRequests = [getOnDemandPageScanRequestDocument(scanGuid, url, priority)];
            pageScanRequestProviderMock
                .setup((o) => o.insertRequests(expectedPageScanRequests))
                .returns(() => Promise.resolve())
                .verifiable();

            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            expect(context.res.status).toEqual(202);
            expect(context.res.body).toEqual(expectedResponse);
        });

        it('accepts request with notification url', async () => {
            const batchGuid = '1e9cefa6-538a-6df0-aaaa-ffffffffffff';
            const scanGuid = '1e9cefa6-538a-6df0-bbbb-ffffffffffff';
            const priority = 10;
            const url = 'https://abs/path/';
            const scanNotifyUrl = 'https://scan-notfiy-url';

            guidGeneratorMock.setup((g) => g.createGuid()).returns(() => batchGuid);
            guidGeneratorMock.setup((g) => g.createGuidFromBaseGuid(batchGuid)).returns(() => scanGuid);

            context.req.rawBody = JSON.stringify([{ url: url, priority: priority, scanNotifyUrl: scanNotifyUrl }]);
            const expectedResponse = [{ scanId: scanGuid, url: url }];

            const expectedMeasurements: BatchScanRequestMeasurements = {
                totalScanRequests: 1,
                acceptedScanRequests: 1,
                rejectedScanRequests: 0,
            };

            // tslint:disable-next-line: no-null-keyword
            loggerMock.setup((lm) => lm.trackEvent('BatchScanRequestSubmitted', null, expectedMeasurements)).verifiable();

            const expectedPageScanResults = [getOnDemandScanBatchResultDocument(scanGuid, batchGuid, url, priority, scanNotifyUrl)];
            onDemandPageScanRunResultProviderMock
                .setup((o) => o.writeScanRuns(expectedPageScanResults))
                .returns(() => Promise.resolve())
                .verifiable();

            const expectedPageScanRequests = [getOnDemandPageScanRequestDocument(scanGuid, url, priority, scanNotifyUrl)];
            pageScanRequestProviderMock
                .setup((o) => o.insertRequests(expectedPageScanRequests))
                .returns(() => Promise.resolve())
                .verifiable();

            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            expect(context.res.status).toEqual(202);
            expect(context.res.body).toEqual(expectedResponse);
        });

        it('v1.0 accepts an array', async () => {
            const batchGuid = '1e9cefa6-538a-6df0-aaaa-ffffffffffff';
            const scanGuid = '1e9cefa6-538a-6df0-bbbb-ffffffffffff';
            const url = 'https://abs/path/';
            const priority = 10;

            guidGeneratorMock.setup((g) => g.createGuid()).returns(() => batchGuid);
            guidGeneratorMock.setup((g) => g.createGuidFromBaseGuid(batchGuid)).returns(() => scanGuid);

            context.req.rawBody = JSON.stringify([{ url: url, priority: priority }]);
            const expectedResponse = [{ scanId: scanGuid, url: url }];

            const expectedPageScanRequestDocuments = [getOnDemandPageScanRequestDocument(scanGuid, 'https://abs/path/', priority)];
            pageScanRequestProviderMock
                .setup((o) => o.insertRequests(expectedPageScanRequestDocuments))
                .returns(() => Promise.resolve())
                .verifiable();

            const expectedPageScanResults = [getOnDemandScanBatchResultDocument(scanGuid, batchGuid, url, priority)];
            onDemandPageScanRunResultProviderMock
                .setup((o) => o.writeScanRuns(expectedPageScanResults))
                .returns(() => Promise.resolve())
                .verifiable();

            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            expect(context.res.status).toEqual(202);
            expect(context.res.body).toEqual(expectedResponse);
            guidGeneratorMock.verifyAll();
        });

        it('v2.0 accepts a single url', async () => {
            const batchGuid = '1e9cefa6-538a-6df0-aaaa-ffffffffffff';
            const scanGuid = '1e9cefa6-538a-6df0-bbbb-ffffffffffff';
            const priority = 10;
            const url = 'https://abs/path/';

            context.req.query['api-version'] = '2.0';

            guidGeneratorMock.setup((g) => g.createGuid()).returns(() => batchGuid);
            guidGeneratorMock.setup((g) => g.createGuidFromBaseGuid(batchGuid)).returns(() => scanGuid);

            context.req.rawBody = JSON.stringify({ url: url, priority: priority });
            const expectedResponse = { scanId: scanGuid, url: url };

            const expectedPageScanRequests = [getOnDemandPageScanRequestDocument(scanGuid, url, priority)];
            pageScanRequestProviderMock
                .setup((o) => o.insertRequests(expectedPageScanRequests))
                .returns(() => Promise.resolve())
                .verifiable();

            const expectedPageScanResults = [getOnDemandScanBatchResultDocument(scanGuid, batchGuid, url, priority)];
            onDemandPageScanRunResultProviderMock
                .setup((o) => o.writeScanRuns(expectedPageScanResults))
                .returns(() => Promise.resolve())
                .verifiable();

            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            expect(context.res.status).toEqual(202);
            expect(context.res.body).toEqual(expectedResponse);
            guidGeneratorMock.verifyAll();
        });

        it('v2.0 does not accept an array', async () => {
            context.req.query['api-version'] = '2.0';
            const priority = 10;

            context.req.rawBody = JSON.stringify([{ url: 'https://abs/path/', priority: priority }]);
            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            expect(context.res.status).toEqual(400);
            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.malformedRequest));
        });

        it('does not accept more than one request', async () => {
            const priority = 10;

            context.req.rawBody = JSON.stringify([
                { url: 'https://abs/path/', priority: priority },
                { url: 'https://abs/path2/', priority: priority },
            ]);
            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.requestBodyTooLarge));
        });
    });

    function getOnDemandScanBatchResultDocument(
        scanId: string,
        batchId: string,
        url: string,
        priority: number,
        notificationUrl?: string,
    ): OnDemandPageScanResult {
        const doc: OnDemandPageScanResult = {
            id: scanId,
            url: url,
            priority: priority,
            itemType: ItemType.onDemandPageScanRunResult,
            partitionKey: `pk-${scanId}`,
            run: {
                state: 'accepted',
                timestamp: dateNow.toJSON(),
            },
            batchRequestId: batchId,
        };

        if (notificationUrl !== undefined) {
            doc.notification = {
                state: 'pending',
                scanNotifyUrl: notificationUrl,
            };
        }

        return doc;
    }

    function getOnDemandPageScanRequestDocument(
        scanId: string,
        url: string,
        priority: number,
        notificationUrl?: string,
    ): OnDemandPageScanRequest {
        const doc: OnDemandPageScanRequest = {
            id: scanId,
            url: 'https://abs/path/',
            priority: priority,
            itemType: ItemType.onDemandPageScanRequest,
            partitionKey: 'pageScanRequestDocuments',
        };

        if (notificationUrl !== undefined) {
            doc.scanNotifyUrl = notificationUrl;
        }

        return doc;
    }
});
