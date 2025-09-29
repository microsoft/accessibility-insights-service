// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GuidGenerator, RestApiConfig, ServiceConfiguration } from 'common';
import moment from 'moment';
import {
    AppContext,
    OnDemandPageScanRunResultProvider,
    ScanBatchRequest,
    ScanResultResponse,
    WebsiteScanDataProvider,
} from 'service-library';
import { ItemType, OnDemandPageScanResult, WebsiteScanData } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { HttpRequest, HttpRequestInit } from '@azure/functions';
import { ScanResponseConverter } from '../converters/scan-response-converter';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { BatchScanResultController } from './batch-scan-result-controller';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(BatchScanResultController, () => {
    let batchScanResultController: BatchScanResultController;
    let appContext: AppContext;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<MockableLogger>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let scanResponseConverterMock: IMock<ScanResponseConverter>;
    let websiteScanDataProviderMock: IMock<WebsiteScanDataProvider>;

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
        schemaVersion: '2',
        partitionKey: 'partition-key',
        url: 'url',
        run: {
            state: 'running',
        },
        priority: 1,
        itemType: ItemType.onDemandPageScanRunResult,
        batchRequestId: 'batch-id',
        websiteScanRef: {
            id: 'websiteScanId',
            scanGroupId: 'scanGroupId',
            scanGroupType: 'deep-scan',
        },
    };
    const scanClientResponseForFetchedResponse: ScanResultResponse = {
        scanId: validScanId,
        url: 'url',
        scanType: 'privacy',
        run: {
            state: 'running',
        },
    };
    const websiteScanData = {} as WebsiteScanData;

    beforeEach(() => {
        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        websiteScanDataProviderMock = Mock.ofType<WebsiteScanDataProvider>();
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
            .setup((o) => o.getScanResultResponse(baseUrl, apiVersion, scanFetchedResponse, websiteScanData))
            .returns(() => Promise.resolve(scanClientResponseForFetchedResponse));
    });

    function createContext(body: string): void {
        const funcHttpRequestInit = {
            url: `${baseUrl}scans/$batch/`,
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            query: { 'api-version': apiVersion },
        } as HttpRequestInit;
        if (body) {
            funcHttpRequestInit.body = { string: body };
        }
        appContext = {
            request: new HttpRequest(funcHttpRequestInit),
        } as AppContext;
    }

    function createScanResultController(requestBody: any): BatchScanResultController {
        createContext(JSON.stringify(requestBody));
        const controller = new BatchScanResultController(
            onDemandPageScanRunResultProviderMock.object,
            websiteScanDataProviderMock.object,
            scanResponseConverterMock.object,
            guidGeneratorMock.object,
            serviceConfigurationMock.object,
            loggerMock.object,
        );
        controller.appContext = appContext;

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
            batchScanResultController = createScanResultController(batchRequestBody);
            const requestTooSoonTimeStamp = moment().subtract(1).toDate();
            const validTimeStamp = new Date(0);

            setupGetGuidTimestamp(validScanId, validTimeStamp);
            setupGetGuidTimestamp(requestedTooSoonScanId, requestTooSoonTimeStamp);
            setupGetGuidTimestamp(notFoundScanId, validTimeStamp);

            const response = await batchScanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            expect(response).toMatchSnapshot();
        });
    });
});
