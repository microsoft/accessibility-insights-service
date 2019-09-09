// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { GuidUtils, RestApiConfig, ServiceConfiguration } from 'common';
import { Logger } from 'logger';
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
    let guidUtilsMock: IMock<GuidUtils>;

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

        guidUtilsMock = Mock.ofType(GuidUtils);

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
        return new ScanRequestController(
            contextReq,
            scanDataProviderMock.object,
            guidUtilsMock.object,
            serviceConfigurationMock.object,
            loggerMock.object,
        );
    }

    describe(ScanRequestController, () => {
        it('reject request with invalid payload', async () => {
            context.req.rawBody = '{ url: ';
            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            expect(context.res.status).toEqual(400);
            expect(context.res.body).toMatch(/Malformed request body\.+/);
        });

        it('reject request with large payload', async () => {
            context.req.rawBody = JSON.stringify([{ url: '' }, { url: '' }, { url: '' }]);
            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            expect(context.res.status).toEqual(413);
            expect(context.res.body).toEqual('Request size is too large');
        });

        it('accept valid request', async () => {
            const guid1 = '1e9cefa6-538a-6df0-aaaa-ffffffffffff';
            const guid2 = '1e9cefa6-538a-6df0-bbbb-ffffffffffff';
            guidUtilsMock.setup(g => g.createGuid()).returns(() => guid1);
            guidUtilsMock.setup(g => g.createGuidForNode(guid1)).returns(() => guid2);

            context.req.rawBody = JSON.stringify([{ url: 'https://abs/path/' }, { url: '/invalid/url' }]);
            const response = [{ scanId: guid2, url: 'https://abs/path/' }, { error: 'Invalid URL', url: '/invalid/url' }];
            scanDataProviderMock.setup(async o => o.writeScanRunBatchRequest(guid1, response)).verifiable(Times.once());

            scanRequestController = createScanRequestController(context);

            await scanRequestController.handleRequest();

            expect(context.res.status).toEqual(202);
            expect(context.res.body).toEqual(response);
            scanDataProviderMock.verifyAll();
            guidUtilsMock.verifyAll();
        });
    });
});
