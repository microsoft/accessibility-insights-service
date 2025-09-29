// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GuidGenerator, RestApiConfig, ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import moment from 'moment';
import {
    WebHttpResponse,
    OnDemandPageScanRunResultProvider,
    ScanResultResponse,
    WebApiErrorCodes,
    WebsiteScanDataProvider,
    AppContext,
} from 'service-library';
import { ItemType, OnDemandPageScanResult, WebsiteScanData } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { HttpRequest, HttpRequestInit } from '@azure/functions';
import { ScanResponseConverter } from '../converters/scan-response-converter';
import { ScanResultController } from './scan-result-controller';

describe(ScanResultController, () => {
    let scanResultController: ScanResultController;
    let appContext: AppContext;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<Logger>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let scanResponseConverterMock: IMock<ScanResponseConverter>;
    let websiteScanDataProviderMock: IMock<WebsiteScanDataProvider>;

    const apiVersion = '1.0';
    const baseUrl = 'https://localhost/api/';
    const scanId = 'scan-id-1';
    const tooSoonRequestResponse: ScanResultResponse = {
        scanId,
        url: undefined,
        scanType: undefined,
        run: {
            state: 'pending',
        },
    };
    const dbResponse: OnDemandPageScanResult = {
        id: scanId,
        schemaVersion: '2',
        deepScanId: scanId,
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
    const scanClientResponseForDbResponse: ScanResultResponse = {
        scanId: scanId,
        url: 'url',
        scanType: 'privacy',
        run: {
            state: 'running',
        },
    };
    const scanResponse: ScanResultResponse = {
        scanId,
        url: 'url',
        scanType: 'privacy',
        run: {
            state: 'running',
        },
    };
    const websiteScanData = {} as WebsiteScanData;

    beforeEach(() => {
        const funcHttpRequestInit = {
            url: `${baseUrl}scans/${scanId}/`,
            method: 'GET',
            headers: { 'content-type': 'application/json' },
            query: { 'api-version': apiVersion },
            params: {
                scanId,
            },
        } as HttpRequestInit;
        appContext = {
            request: new HttpRequest(funcHttpRequestInit),
        } as AppContext;

        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        websiteScanDataProviderMock = Mock.ofType<WebsiteScanDataProvider>();
        websiteScanDataProviderMock.setup(async (o) => o.read(dbResponse.websiteScanRef.id)).returns(async () => websiteScanData);
        onDemandPageScanRunResultProviderMock.setup(async (o) => o.readScanRuns(It.isAny()));

        guidGeneratorMock = Mock.ofType(GuidGenerator);
        guidGeneratorMock
            .setup((gm) => gm.isValidV6Guid(scanId))
            .returns(() => true)
            .verifiable(Times.once());
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

        loggerMock = Mock.ofType<Logger>();
        scanResponseConverterMock = Mock.ofType<ScanResponseConverter>();

        scanResultController = createScanResultController();
    });

    function createScanResultController(): ScanResultController {
        const controller = new ScanResultController(
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

    function setupGetGuidTimestamp(time: Date): void {
        guidGeneratorMock
            .setup((gm) => gm.getGuidTimestamp(scanId))
            .returns(() => time)
            .verifiable(Times.atLeast(1));
    }

    describe('handleRequest', () => {
        it('should return 400 for invalid scan Id that is not a v6 guid', async () => {
            guidGeneratorMock.reset();
            guidGeneratorMock
                .setup((gm) => gm.isValidV6Guid(scanId))
                .returns(() => false)
                .verifiable(Times.once());
            const response = await scanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            expect(response).toEqual(WebHttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId));
        });

        it('should return 400 for invalid scan Id that has a future timestamp', async () => {
            const timeStamp = moment().add(1, 'year').toDate();
            setupGetGuidTimestamp(timeStamp);

            const response = await scanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            expect(response).toEqual(WebHttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId));
        });

        it('should return a default response for requests made within 10 sec buffer', async () => {
            const timeStamp = moment().add(1, 'second').toDate();
            setupGetGuidTimestamp(timeStamp);

            const response = await scanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            expect(response.status).toEqual(200);
            expect(response.jsonBody).toEqual(tooSoonRequestResponse);
        });

        describe('return proper response if scan is not found', () => {
            it('should return tooSoonRequestResponse error code if the request is made too soon', async () => {
                const timeStamp = moment().subtract(1).toDate();
                setupGetGuidTimestamp(timeStamp);
                onDemandPageScanRunResultProviderMock
                    .setup(async (om) => om.readScanRuns([scanId]))
                    .returns(async () => {
                        return Promise.resolve([]);
                    })
                    .verifiable(Times.once());

                const response = await scanResultController.handleRequest();

                guidGeneratorMock.verifyAll();
                onDemandPageScanRunResultProviderMock.verifyAll();
                expect(response.status).toEqual(200);
                expect(response.jsonBody).toEqual(tooSoonRequestResponse);
            });

            it('should return resourceNotFound error code if the request is made after threshold', async () => {
                setupGetGuidTimestamp(new Date(0));
                onDemandPageScanRunResultProviderMock
                    .setup(async (om) => om.readScanRuns([scanId]))
                    .returns(async () => {
                        return Promise.resolve([]);
                    })
                    .verifiable(Times.once());

                const response = await scanResultController.handleRequest();

                guidGeneratorMock.verifyAll();
                onDemandPageScanRunResultProviderMock.verifyAll();
                expect(response).toEqual(WebHttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound));
            });
        });

        it('should return 200 if successfully fetched result', async () => {
            setupGetGuidTimestamp(new Date(0));
            onDemandPageScanRunResultProviderMock.reset();
            onDemandPageScanRunResultProviderMock
                .setup(async (om) => om.readScanRuns([scanId]))
                .returns(async () => {
                    return Promise.resolve([dbResponse]);
                })
                .verifiable(Times.once());

            scanResponseConverterMock
                .setup((o) => o.getScanResultResponse(baseUrl, apiVersion, dbResponse, websiteScanData))
                .returns(() => Promise.resolve(scanClientResponseForDbResponse));

            const response = await scanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            onDemandPageScanRunResultProviderMock.verifyAll();
            expect(response.status).toEqual(200);
            expect(response.jsonBody).toEqual(scanResponse);
        });
    });
});
