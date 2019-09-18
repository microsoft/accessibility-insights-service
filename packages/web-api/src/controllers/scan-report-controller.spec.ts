// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { GuidGenerator, RestApiConfig, ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { PageScanRunReportService } from 'service-library';
import { ItemType, OnDemandPageScanResult } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';

import { BlobContentDownloadResponse } from 'azure-services';
import { Stream } from 'stream';
import { ScanBatchRequest } from './../api-contracts/scan-batch-request';
import { ScanReportController } from './scan-report-controller';

describe(ScanReportController, () => {
    let scanReportController: ScanReportController;
    let context: Context;
    let reportServiceMock: IMock<PageScanRunReportService>;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<Logger>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    const validId = 'valid-id';
    const notFoundId = 'not-found-id';
    const invalidId = 'invalid-id';
    let contentMock: IMock<NodeJS.ReadableStream>;
    let downloadResponse: BlobContentDownloadResponse;

    const notFoundDownloadResponse: BlobContentDownloadResponse = {
        notFound: true,
        content: undefined,
    };

    beforeEach(() => {
        context = <Context>(<unknown>{
            req: {
                method: 'GET',
                headers: {},
                rawBody: ``,
                query: {},
            },
            bindingData: {},
        });
        contentMock = Mock.ofType(Stream.Readable);
        contentMock
            // tslint:disable-next-line: no-unsafe-any
            .setup(cm => cm.pipe(It.isAny()))
            .verifiable(Times.once());
        context.req.query['api-version'] = '1.0';
        context.req.headers['content-type'] = 'application/json';
        reportServiceMock = Mock.ofType<PageScanRunReportService>();
        downloadResponse = {
            notFound: false,
            content: contentMock.object,
        };
        reportServiceMock
            .setup(async rm => rm.readSarifReport(It.isAnyString()))
            .returns(async id => {
                return id === validId ? downloadResponse : notFoundDownloadResponse;
            });
        guidGeneratorMock = Mock.ofType(GuidGenerator);
        guidGeneratorMock
            .setup(gm => gm.isValidV6Guid(It.isAnyString()))
            .returns(id => {
                return id !== invalidId;
            });

        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();

        loggerMock = Mock.ofType<Logger>();
    });

    function createScanResultController(contextReq: Context): ScanReportController {
        const controller = new ScanReportController(
            reportServiceMock.object,
            guidGeneratorMock.object,
            serviceConfigurationMock.object,
            loggerMock.object,
        );
        controller.context = contextReq;

        return controller;
    }

    describe('handleRequest', () => {
        it('should return 422 if request body is empty array', async () => {
            context.bindingData.reportId = invalidId;
            scanReportController = createScanResultController(context);

            await scanReportController.handleRequest();

            expect(context.res.status).toEqual(422);
            expect(context.res.body).toEqual(`Invalid report id: ${invalidId}.`);
        });

        it('should return 404 if report not found', async () => {
            context.bindingData.reportId = notFoundId;
            scanReportController = createScanResultController(context);

            await scanReportController.handleRequest();

            expect(context.res.status).toEqual(404);
        });

        it('should return stream', async () => {
            context.bindingData.reportId = validId;
            scanReportController = createScanResultController(context);

            await scanReportController.handleRequest();

            contentMock.verifyAll();
            expect(context.res.status).toEqual(200);
            expect(context.res.body).toBeDefined();
        });
    });
});
