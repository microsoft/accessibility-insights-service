// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { GuidGenerator, RestApiConfig, ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { HttpResponse, OnDemandPageScanRunResultProvider, ScanResultResponse, WebApiErrorCodes } from 'service-library';
import { ItemType, OnDemandPageScanResult } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';

import { ScanResponseConverter } from '../converters/scan-response-converter';
import { ScanResultController } from './scan-result-controller';

// tslint:disable: no-unsafe-any

describe(ScanResultController, () => {
    let scanResultController: ScanResultController;
    let context: Context;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<Logger>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let scanResponseConverterMock: IMock<ScanResponseConverter>;
    const apiVersion = '1.0';
    const baseUrl = 'https://localhost/api/';
    const scanId = 'scan-id-1';
    const tooSoonRequestResponse: ScanResultResponse = {
        scanId,
        url: undefined,
        run: {
            state: 'pending',
        },
    };
    const dbResponse: OnDemandPageScanResult = {
        id: scanId,
        partitionKey: 'partition-key',
        url: 'url',
        run: {
            state: 'running',
        },
        priority: 1,
        itemType: ItemType.onDemandPageScanRunResult,
        batchRequestId: 'batch-id',
    };
    const scanClientResponseForDbResponse: ScanResultResponse = {
        scanId: scanId,
        url: 'url',
        run: {
            state: 'running',
        },
    };
    const scanResponse: ScanResultResponse = {
        scanId,
        url: 'url',
        run: {
            state: 'running',
        },
    };

    beforeEach(() => {
        context = <Context>(<unknown>{
            req: {
                url: `${baseUrl}scans/$batch/`,
                method: 'GET',
                headers: {},
                query: {},
            },
            bindingData: {
                scanId,
            },
        });
        context.req.query['api-version'] = apiVersion;
        context.req.headers['content-type'] = 'application/json';

        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        onDemandPageScanRunResultProviderMock.setup(async o => o.readScanRuns(It.isAny()));

        guidGeneratorMock = Mock.ofType(GuidGenerator);
        guidGeneratorMock
            .setup(gm => gm.isValidV6Guid(scanId))
            .returns(() => true)
            .verifiable(Times.once());
        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();
        serviceConfigurationMock
            .setup(async s => s.getConfigValue('restApiConfig'))
            .returns(async () => {
                // tslint:disable-next-line: no-object-literal-type-assertion
                return {
                    maxScanRequestBatchCount: 2,
                    scanRequestProcessingDelayInSeconds: 120,
                } as RestApiConfig;
            });

        loggerMock = Mock.ofType<Logger>();

        scanResponseConverterMock = Mock.ofType<ScanResponseConverter>();
    });

    function createScanResultController(contextReq: Context): ScanResultController {
        const controller = new ScanResultController(
            onDemandPageScanRunResultProviderMock.object,
            scanResponseConverterMock.object,
            guidGeneratorMock.object,
            serviceConfigurationMock.object,
            loggerMock.object,
        );
        controller.context = contextReq;

        return controller;
    }

    function setupGetGuidTimestamp(time: Date): void {
        guidGeneratorMock
            .setup(gm => gm.getGuidTimestamp(scanId))
            .returns(() => time)
            .verifiable(Times.once());
    }

    describe('handleRequest', () => {
        it('should return 400 for invalid scan Id', async () => {
            scanResultController = createScanResultController(context);
            guidGeneratorMock.reset();
            guidGeneratorMock
                .setup(gm => gm.isValidV6Guid(scanId))
                .returns(() => false)
                .verifiable(Times.once());

            await scanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId));
        });

        it('should return a default response for requests made too early', async () => {
            scanResultController = createScanResultController(context);
            const timeStamp = new Date();
            timeStamp.setFullYear(timeStamp.getFullYear() + 1);
            setupGetGuidTimestamp(timeStamp);

            await scanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            expect(context.res.status).toEqual(200);
            expect(context.res.body).toEqual(tooSoonRequestResponse);
        });

        it('should return 404 if the scan cannot be found', async () => {
            scanResultController = createScanResultController(context);
            setupGetGuidTimestamp(new Date(0));
            onDemandPageScanRunResultProviderMock
                .setup(async om => om.readScanRuns([scanId]))
                .returns(async () => {
                    return Promise.resolve([]);
                })
                .verifiable(Times.once());

            await scanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            onDemandPageScanRunResultProviderMock.verifyAll();
            expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound));
        });

        it('should return 200 if successfully fetched result', async () => {
            scanResultController = createScanResultController(context);
            setupGetGuidTimestamp(new Date(0));
            onDemandPageScanRunResultProviderMock.reset();

            onDemandPageScanRunResultProviderMock
                .setup(async om => om.readScanRuns([scanId]))
                .returns(async () => {
                    return Promise.resolve([dbResponse]);
                })
                .verifiable(Times.once());

            scanResponseConverterMock
                .setup(o => o.getScanResultResponse(baseUrl, apiVersion, dbResponse))
                .returns(() => scanClientResponseForDbResponse);

            await scanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            onDemandPageScanRunResultProviderMock.verifyAll();
            expect(context.res.status).toEqual(200);
            expect(context.res.body).toEqual(scanResponse);
        });
    });
});
