// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { GuidGenerator, RestApiConfig, ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { ScanRunBatchRequest } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { ScanDataProvider } from '../providers/scan-data-provider';
import { ScanRequestController } from './scan-request-controller';

// tslint:disable: no-unsafe-any no-object-literal-type-assertion

describe(ScanRequestController, () => {
    let scanRequestController: ScanRequestController;
    let context: Context;
    let scanDataProviderMock: IMock<ScanDataProvider>;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<Logger>;
    let guidGeneratorMock: IMock<GuidGenerator>;

    beforeEach(() => {
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

        scanDataProviderMock = Mock.ofType<ScanDataProvider>();
        scanDataProviderMock.setup(async o => o.writeScanRunBatchRequest(It.isAny(), It.isAny()));

        guidGeneratorMock = Mock.ofType(GuidGenerator);

        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();
        serviceConfigurationMock
            .setup(async s => s.getConfigValue('restApiConfig'))
            .returns(async () => {
                return {
                    maxScanRequestBatchCount: 2,
                } as RestApiConfig;
            });

        loggerMock = Mock.ofType<Logger>();
    });

    function createScanRequestController(contextReq: Context): ScanRequestController {
        const controller = new ScanRequestController(
            scanDataProviderMock.object,
            guidGeneratorMock.object,
            serviceConfigurationMock.object,
            loggerMock.object,
        );
        controller.context = contextReq;

        return controller;
    }

    describe(ScanRequestController, () => {
        it('rejects request with invalid payload', async () => {
            context.req.rawBody = '{ url: ';
            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            expect(context.res.status).toEqual(400);
        });

        it('rejects request with large payload', async () => {
            context.req.rawBody = JSON.stringify([{ url: '' }, { url: '' }, { url: '' }]);
            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            expect(context.res.status).toEqual(413);
            expect(context.res.body).toEqual('Request size is too large');
        });

        it('accepts valid request only', async () => {
            const guid1 = '1e9cefa6-538a-6df0-aaaa-ffffffffffff';
            const guid2 = '1e9cefa6-538a-6df0-bbbb-ffffffffffff';
            guidGeneratorMock.setup(g => g.createGuid()).returns(() => guid1);
            guidGeneratorMock.setup(g => g.createGuidFromBaseGuid(guid1)).returns(() => guid2);

            context.req.rawBody = JSON.stringify([{ url: 'https://abs/path/' }, { url: '/invalid/url' }]);
            const expectedResponse = [{ scanId: guid2, url: 'https://abs/path/' }, { error: 'Invalid URL', url: '/invalid/url' }];
            const expectedSavedRequest: ScanRunBatchRequest[] = [{ scanId: guid2, url: 'https://abs/path/', priority: 0 }];
            scanDataProviderMock.setup(async o => o.writeScanRunBatchRequest(guid1, expectedSavedRequest)).verifiable(Times.once());

            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            expect(context.res.status).toEqual(202);
            expect(context.res.body).toEqual(expectedResponse);
            scanDataProviderMock.verifyAll();
            guidGeneratorMock.verifyAll();
        });

        it('accepts request with priority', async () => {
            const guid1 = '1e9cefa6-538a-6df0-aaaa-ffffffffffff';
            const guid2 = '1e9cefa6-538a-6df0-bbbb-ffffffffffff';
            guidGeneratorMock.setup(g => g.createGuid()).returns(() => guid1);
            guidGeneratorMock.setup(g => g.createGuidFromBaseGuid(guid1)).returns(() => guid2);
            const priority = 10;

            context.req.rawBody = JSON.stringify([{ url: 'https://abs/path/', priority: priority }]);
            const expectedResponse = [{ scanId: guid2, url: 'https://abs/path/' }];
            const expectedSavedRequest: ScanRunBatchRequest[] = [{ scanId: guid2, url: 'https://abs/path/', priority: priority }];
            scanDataProviderMock.setup(async o => o.writeScanRunBatchRequest(guid1, expectedSavedRequest)).verifiable(Times.once());

            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            expect(context.res.status).toEqual(202);
            expect(context.res.body).toEqual(expectedResponse);
            scanDataProviderMock.verifyAll();
            guidGeneratorMock.verifyAll();
        });
    });
});
