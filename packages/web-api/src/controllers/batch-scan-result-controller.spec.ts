// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { GuidGenerator, RestApiConfig, ServiceConfiguration } from 'common';
import moment from 'moment';
import { OnDemandPageScanRunResultProvider, ScanBatchRequest, ScanResultResponse, WebsiteScanResultProvider } from 'service-library';
import { ItemType, OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { ScanResponseConverter } from '../converters/scan-response-converter';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { BatchScanResultController } from './batch-scan-result-controller';

describe(BatchScanResultController, () => {
    let batchScanResultController: BatchScanResultController;
    let context: Context;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<MockableLogger>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let scanResponseConverterMock: IMock<ScanResponseConverter>;
    let websiteScanResultProviderMock: IMock<WebsiteScanResultProvider>;

    const apiVersion = '1.0';
    const baseUrl = 'https://localhost/api/';
    const validScanId = 'valid-scan-id';
    const notFoundScanId = 'not-found-scan-id';
    const invalidScanId = 'invalid-scan-id';
    const requestedTooSoonScanId = 'requested-too-soon-scan-id';
    const batchRequestBody: ScanBatchRequest[] = [
        { scanId: validScanId },
        { scanId: notFoundScanId },
        { scanId: invalidScanId },
        { scanId: requestedTooSoonScanId },
    ];
    const scanFetchedResponse: OnDemandPageScanResult = {
        id: validScanId,
        partitionKey: 'partition-key',
        url: 'url',
        run: {
            state: 'running',
        },
        priority: 1,
        itemType: ItemType.onDemandPageScanRunResult,
        batchRequestId: 'batch-id',
        websiteScanRefs: [
            {
                id: 'websiteScanId',
                scanGroupType: 'deep-scan',
            },
        ],
    };
    const scanClientResponseForFetchedResponse: ScanResultResponse = {
        scanId: validScanId,
        url: 'url',
        run: {
            state: 'running',
        },
    };
    const websiteScanResult = {} as WebsiteScanResult;

    beforeEach(() => {
        context = <Context>(<unknown>{
            req: {
                url: `${baseUrl}scans/$batch/`,
                method: 'POST',
                headers: {},
                rawBody: `[]`,
                query: {},
            },
        });
        context.req.query['api-version'] = apiVersion;
        context.req.headers['content-type'] = 'application/json';
        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        onDemandPageScanRunResultProviderMock
            .setup(async (o) => o.readScanRuns(It.isAny()))
            .returns(async () => Promise.resolve([scanFetchedResponse]));

        guidGeneratorMock = Mock.ofType(GuidGenerator);
        guidGeneratorMock
            .setup((gm) => gm.isValidV6Guid(It.isAnyString()))
            .returns((id) => {
                return id !== invalidScanId;
            });

        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();
        serviceConfigurationMock
            .setup(async (s) => s.getConfigValue('restApiConfig'))
            .returns(async () => {
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                return {
                    maxScanRequestBatchCount: 2,
                    scanRequestProcessingDelayInSeconds: 120,
                } as RestApiConfig;
            });

        loggerMock = Mock.ofType<MockableLogger>();

        scanResponseConverterMock = Mock.ofType<ScanResponseConverter>();
        scanResponseConverterMock
            .setup((o) => o.getScanResultResponse(baseUrl, apiVersion, scanFetchedResponse, websiteScanResult))
            .returns(() => scanClientResponseForFetchedResponse);

        websiteScanResultProviderMock = Mock.ofType<WebsiteScanResultProvider>();
        websiteScanResultProviderMock
            .setup((o) => o.read(scanFetchedResponse.websiteScanRefs[0].id))
            .returns(() => Promise.resolve(websiteScanResult));
    });

    function createScanResultController(contextReq: Context): BatchScanResultController {
        const controller = new BatchScanResultController(
            onDemandPageScanRunResultProviderMock.object,
            websiteScanResultProviderMock.object,
            scanResponseConverterMock.object,
            guidGeneratorMock.object,
            serviceConfigurationMock.object,
            loggerMock.object,
        );
        controller.context = contextReq;

        return controller;
    }

    function setupGetGuidTimestamp(scanId: string, time: Date): void {
        guidGeneratorMock
            .setup((gm) => gm.getGuidTimestamp(scanId))
            .returns(() => time)
            .verifiable(Times.atLeast(1));
    }

    describe('handleRequest', () => {
        it('should return different response for different kind of scanIds', async () => {
            context.req.rawBody = JSON.stringify(batchRequestBody);
            batchScanResultController = createScanResultController(context);
            const requestTooSoonTimeStamp = moment().subtract(1).toDate();
            const validTimeStamp = new Date(0);

            setupGetGuidTimestamp(validScanId, validTimeStamp);
            setupGetGuidTimestamp(requestedTooSoonScanId, requestTooSoonTimeStamp);
            setupGetGuidTimestamp(notFoundScanId, validTimeStamp);

            await batchScanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            expect(context.res.status).toEqual(200);
            expect(context.res.body).toMatchSnapshot();
        });
    });
});
