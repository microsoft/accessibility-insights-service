// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import { ItemType, OnDemandPageScanResult } from 'storage-documents';

import { Context } from '@azure/functions';
import { GuidGenerator, RestApiConfig, ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import { IMock, It, Mock, Times } from 'typemoq';
import { ScanResultErrorResponse } from '../api-contracts/scan-result-response';
import { ScanResultResponse } from './../api-contracts/scan-result-response';
import { ScanResultController } from './scan-result-controller';

describe(ScanResultController, () => {
    let scanResultController: ScanResultController;
    let context: Context;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<Logger>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    const scanId = 'scan-id-1';
    const tooSoonRequestResponse: ScanResultResponse = {
        scanId,
        url: undefined,
        run: {
            state: 'accepted',
        },
    };
    const scanNotFoundResponse: ScanResultResponse = {
        scanId,
        url: undefined,
        run: {
            state: 'not found',
        },
    };
    const dbResponse: OnDemandPageScanResult = {
        id: scanId,
        partitionKey: 'pk',
        url: 'url',
        run: {
            state: 'running',
        },
        priority: 1,
        itemType: ItemType.onDemandPageScanRunResult,
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
                method: 'GET',
                headers: {},
                query: {},
            },
            bindingData: {
                scanId,
            },
        });
        context.req.query['api-version'] = '1.0';
        context.req.headers['content-type'] = 'application/json';

        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        // tslint:disable-next-line: no-unsafe-any
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
                    minimumWaitTimeforScanResultQueryInSeconds: 120,
                    minimumWaitTimeforCosmosTriggerInSeconds: 300,
                } as RestApiConfig;
            });

        loggerMock = Mock.ofType<Logger>();
    });

    function createScanResultController(contextReq: Context): ScanResultController {
        const controller = new ScanResultController(
            onDemandPageScanRunResultProviderMock.object,
            guidGeneratorMock.object,
            serviceConfigurationMock.object,
            loggerMock.object,
        );
        controller.context = contextReq;

        return controller;
    }

    function setupGetGuidTimestamp(time: Date, times: number): void {
        guidGeneratorMock
            .setup(gm => gm.getGuidTimestamp(scanId))
            .returns(() => time)
            .verifiable(Times.exactly(times));
    }

    describe('handleRequest', () => {
        it('should return 422 for invalid scanId', async () => {
            const invalidRequestResponse: ScanResultErrorResponse = {
                scanId: scanId,
                error: `Unprocessable Entity: ${scanId}.`,
            };
            scanResultController = createScanResultController(context);
            guidGeneratorMock.reset();
            guidGeneratorMock
                .setup(gm => gm.isValidV6Guid(scanId))
                .returns(() => false)
                .verifiable(Times.once());

            await scanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            expect(context.res.status).toEqual(422);
            expect(context.res.body).toEqual(invalidRequestResponse);
        });

        it('should return a default response for requests made too early', async () => {
            scanResultController = createScanResultController(context);
            const timeStamp = new Date();
            timeStamp.setFullYear(timeStamp.getFullYear() + 1);
            setupGetGuidTimestamp(timeStamp, 1);

            await scanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            expect(context.res.status).toEqual(202);
            expect(context.res.body).toEqual(tooSoonRequestResponse);
        });

        it('should return 404 if the scan cannot be found', async () => {
            scanResultController = createScanResultController(context);
            setupGetGuidTimestamp(new Date(0), 2);
            onDemandPageScanRunResultProviderMock
                .setup(async om => om.readScanRuns([scanId]))
                .returns(async () => {
                    return Promise.resolve([]);
                })
                .verifiable(Times.once());

            await scanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            onDemandPageScanRunResultProviderMock.verifyAll();
            expect(context.res.status).toEqual(404);
            expect(context.res.body).toEqual(scanNotFoundResponse);
        });

        it('should return 200 if successfully fetched result', async () => {
            scanResultController = createScanResultController(context);
            setupGetGuidTimestamp(new Date(0), 1);
            onDemandPageScanRunResultProviderMock.reset();

            onDemandPageScanRunResultProviderMock
                // tslint:disable-next-line: no-unsafe-any
                .setup(async om => om.readScanRuns([scanId]))
                .returns(async () => {
                    return Promise.resolve([dbResponse]);
                })
                .verifiable(Times.once());

            await scanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            onDemandPageScanRunResultProviderMock.verifyAll();
            expect(context.res.status).toEqual(200);
            expect(context.res.body).toEqual(scanResponse);
        });
    });
});
