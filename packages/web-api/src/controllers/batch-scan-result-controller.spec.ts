// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import { InvalidOnDemandPageScanResultResponse, ItemType, OnDemandPageScanResult } from 'storage-documents';

import { Context } from '@azure/functions';
import { GuidGenerator, RestApiConfig, ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import { IMock, It, Mock, Times } from 'typemoq';
import { BatchScanResultController } from './batch-scan-result-controller';

describe(BatchScanResultController, () => {
    let batchScanResultController: BatchScanResultController;
    let context: Context;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<Logger>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    const scanId1 = 'scan-id-1';
    const scanId2 = 'scan-id-2';
    const tooSoonRequestResponse: OnDemandPageScanResult = {
        id: scanId1,
        partitionKey: undefined,
        url: undefined,
        run: {
            state: 'accepted',
        },
        priority: undefined,
        itemType: ItemType.onDemandPageScanRunResult,
    };
    const scanNotFoundResponse: OnDemandPageScanResult = {
        id: scanId1,
        partitionKey: undefined,
        url: undefined,
        run: {
            state: 'unknown',
        },
        priority: undefined,
        itemType: ItemType.onDemandPageScanRunResult,
    };
    const response: OnDemandPageScanResult = {
        id: scanId1,
        partitionKey: 'pk',
        url: 'url',
        run: {
            state: 'running',
        },
        priority: 1,
        itemType: ItemType.onDemandPageScanRunResult,
    };

    beforeEach(() => {
        context = <Context>(<unknown>{
            req: {
                method: 'POST',
                headers: {},
                rawBody: `[]`,
                query: {},
            },
        });
        context.req.query['api-version'] = '1.0';
        context.req.headers['content-type'] = 'application/json';

        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        // tslint:disable-next-line: no-unsafe-any
        onDemandPageScanRunResultProviderMock.setup(async o => o.readScanRuns(It.isAny()));

        guidGeneratorMock = Mock.ofType(GuidGenerator);

        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();
        serviceConfigurationMock
            .setup(async s => s.getConfigValue('restApiConfig'))
            .returns(async () => {
                // tslint:disable-next-line: no-object-literal-type-assertion
                return {
                    maxScanRequestBatchCount: 2,
                    minimumWaitTimeforScanResultQueryInSeconds: 120,
                } as RestApiConfig;
            });

        loggerMock = Mock.ofType<Logger>();
    });

    function createScanResultController(contextReq: Context): BatchScanResultController {
        return new BatchScanResultController(
            contextReq,
            onDemandPageScanRunResultProviderMock.object,
            guidGeneratorMock.object,
            serviceConfigurationMock.object,
            loggerMock.object,
        );
    }

    function setupGetGuidTimestamp(time: Date): void {
        guidGeneratorMock
            .setup(gm => gm.getGuidTimestamp(scanId1))
            .returns(() => time)
            .verifiable(Times.once());
    }

    describe('handleRequest', () => {
        it('should return 422 for invalid scanId', async () => {
            const invalidRequestResponse: InvalidOnDemandPageScanResultResponse = {
                id: scanId1,
                error: `Unprocessable Entity: ${scanId1}. Error: Only version 6 of UUID is supported`,
            };
            batchScanResultController = createScanResultController(context);
            guidGeneratorMock
                .setup(gm => gm.getGuidTimestamp(scanId1))
                .returns(() => {
                    throw new Error('Only version 6 of UUID is supported');
                })
                .verifiable(Times.once());

            await batchScanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            expect(context.res.status).toEqual(422);
            expect(context.res.body).toEqual(invalidRequestResponse);
        });

        it('should return a default response for requests made too early', async () => {
            batchScanResultController = createScanResultController(context);
            const timeStamp = new Date();
            timeStamp.setFullYear(timeStamp.getFullYear() + 1);
            setupGetGuidTimestamp(timeStamp);

            await batchScanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            expect(context.res.status).toEqual(202);
            expect(context.res.body).toEqual(tooSoonRequestResponse);
        });

        it('should return 404 if the scan cannot be found', async () => {
            batchScanResultController = createScanResultController(context);
            setupGetGuidTimestamp(new Date(0));
            onDemandPageScanRunResultProviderMock
                .setup(async om => om.readScanRuns([scanId1]))
                .returns(async () => {
                    return Promise.resolve([]);
                })
                .verifiable(Times.once());

            await batchScanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            onDemandPageScanRunResultProviderMock.verifyAll();
            expect(context.res.status).toEqual(404);
            expect(context.res.body).toEqual(scanNotFoundResponse);
        });

        it('should return 200 if successfully fetched result', async () => {
            batchScanResultController = createScanResultController(context);
            setupGetGuidTimestamp(new Date(0));
            onDemandPageScanRunResultProviderMock.reset();
            onDemandPageScanRunResultProviderMock
                // tslint:disable-next-line: no-unsafe-any
                .setup(async om => om.readScanRuns([scanId1]))
                .returns(async () => {
                    return Promise.resolve([response]);
                })
                .verifiable(Times.once());

            await batchScanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            onDemandPageScanRunResultProviderMock.verifyAll();
            expect(context.res.status).toEqual(200);
            expect(context.res.body).toEqual(response);
        });
    });
});
