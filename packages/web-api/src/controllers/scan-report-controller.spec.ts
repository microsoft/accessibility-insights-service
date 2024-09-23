// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Readable } from 'stream';
import { BlobContentDownloadResponse } from 'azure-services';
import { GuidGenerator, ServiceConfiguration, BodyParser } from 'common';
import { WebHttpResponse, PageScanRunReportProvider, WebApiErrorCodes, AppContext } from 'service-library';
import { IMock, It, Mock, Times } from 'typemoq';
import { HttpRequest, HttpRequestInit } from '@azure/functions';
import { MockableLogger } from '../test-utilities/mockable-logger';

import { ScanReportController } from './scan-report-controller';

describe(ScanReportController, () => {
    let scanReportController: ScanReportController;
    let appContext: AppContext;
    let pageScanRunReportProviderMock: IMock<PageScanRunReportProvider>;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<MockableLogger>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let contentMock: IMock<NodeJS.ReadableStream>;
    let downloadResponse: BlobContentDownloadResponse;
    let bodyParserMock: IMock<BodyParser>;
    let buffer: Buffer;

    const validId = 'valid-id';
    const notFoundId = 'not-found-id';
    const invalidId = 'invalid-id';
    const notFoundDownloadResponse: BlobContentDownloadResponse = {
        notFound: true,
        content: undefined,
    };

    beforeEach(() => {
        buffer = Buffer.from('A chunk of data');
        contentMock = Mock.ofType(Readable);

        bodyParserMock = Mock.ofType(BodyParser);
        bodyParserMock
            .setup(async (bpm) => bpm.getRawBody(contentMock.object as Readable))
            .returns(async () => buffer)
            .verifiable(Times.once());

        pageScanRunReportProviderMock = Mock.ofType<PageScanRunReportProvider>();
        downloadResponse = {
            notFound: false,
            content: contentMock.object,
        };
        pageScanRunReportProviderMock
            .setup(async (rm) => rm.readReport(It.isAnyString()))
            .returns(async (id) => {
                return id === validId ? downloadResponse : notFoundDownloadResponse;
            });
        guidGeneratorMock = Mock.ofType(GuidGenerator);
        guidGeneratorMock
            .setup((gm) => gm.isValidV6Guid(It.isAnyString()))
            .returns((id) => {
                return id !== invalidId;
            });

        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();

        loggerMock = Mock.ofType<MockableLogger>();
    });

    function createContext(urlParam: string, urlValue: string): void {
        const funcHttpRequestInit = {
            url: 'http://localhost/',
            method: 'GET',
            headers: { 'content-type': 'application/json' },
            query: { 'api-version': '1.0' },
            params: {
                [urlParam]: urlValue,
            },
        } as HttpRequestInit;
        appContext = {
            request: new HttpRequest(funcHttpRequestInit),
        } as AppContext;
    }

    function createScanResultController(urlParam: string, urlValue: string): ScanReportController {
        createContext(urlParam, urlValue);
        const controller = new ScanReportController(
            pageScanRunReportProviderMock.object,
            guidGeneratorMock.object,
            serviceConfigurationMock.object,
            loggerMock.object,
            bodyParserMock.object,
        );
        controller.appContext = appContext;

        return controller;
    }

    describe('handleRequest', () => {
        it('should return 400 if request id is invalid', async () => {
            scanReportController = createScanResultController('reportId', invalidId);
            const response = await scanReportController.handleRequest();

            expect(response).toEqual(WebHttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId));
        });

        it('should return 404 if report not found', async () => {
            scanReportController = createScanResultController('reportId', notFoundId);
            const response = await scanReportController.handleRequest();

            expect(response.status).toEqual(404);
        });

        it('should return stream', async () => {
            scanReportController = createScanResultController('reportId', validId);
            const response = await scanReportController.handleRequest();

            contentMock.verifyAll();
            expect(response.status).toEqual(200);
            expect(response.body).toEqual(buffer);
        });
    });
});
