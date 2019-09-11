// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import { ItemType, OnDemandPageScanResult } from 'storage-documents';

import { Context } from '@azure/functions';
import { GuidGenerator, RestApiConfig, ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import { IMock, It, Mock, Times } from 'typemoq';
import { ScanResultController } from './scan-result-controller';
describe(ScanResultController, () => {
    let scanResultController: ScanResultController;
    let context: Context;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<Logger>;
    let guidGeneratorMock: IMock<GuidGenerator>;

    beforeEach(() => {
        context = <Context>(<unknown>{
            req: {
                method: 'GET',
                headers: {},
                query: {},
            },
            bindingData: {
                scanId: 'scan-id-1',
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
                    scanResultQueryBufferInSeconds: 120,
                } as RestApiConfig;
            });

        loggerMock = Mock.ofType<Logger>();
    });

    function createScanResultController(contextReq: Context): ScanResultController {
        return new ScanResultController(
            contextReq,
            onDemandPageScanRunResultProviderMock.object,
            guidGeneratorMock.object,
            serviceConfigurationMock.object,
            loggerMock.object,
        );
    }

    describe('handleRequest', () => {
        it('should return 422 for invalid scanId', async () => {
            const invalidId = 'invalid-id-1';
            context.bindingData.scanId = invalidId;
            scanResultController = createScanResultController(context);
            guidGeneratorMock
                .setup(gm => gm.getGuidTimestamp(invalidId))
                .returns(() => {
                    throw new Error('Only version 6 of UUID is supported');
                })
                .verifiable(Times.once());

            await scanResultController.handleRequest();

            guidGeneratorMock.verifyAll();
            expect(context.res.status).toEqual(422);
            expect(context.res.body).toEqual(`Unprocessable Entity: ${invalidId}. Error: Only version 6 of UUID is supported`);
        });

        it('should return a default response for requests made too early', async () => {
            const scanId = 'scanId';
            context.bindingData.scanId = scanId;
            scanResultController = createScanResultController(context);
            const defaultResponse: OnDemandPageScanResult = {
                id: scanId,
                partitionKey: undefined,
                url: undefined,
                run: {
                    state: 'accepted',
                },
                priority: undefined,
                itemType: ItemType.onDemandPageScanRunResult,
            };
            guidGeneratorMock
                .setup(gm => gm.getGuidTimestamp(scanId))
                .returns(() => {
                    const timeStamp = new Date();
                    timeStamp.setFullYear(timeStamp.getFullYear() + 1);

                    return timeStamp;
                })
                .verifiable(Times.once());

            await scanResultController.handleRequest();

            expect(context.res.status).toEqual(202);
            expect(context.res.body).toEqual(defaultResponse);
        });
    });
});
