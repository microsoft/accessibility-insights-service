// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GuidGenerator, RestApiConfig, ServiceConfiguration, CrawlConfig } from 'common';
import { ScanRequestReceivedMeasurements } from 'logger';
import { WebHttpResponse, ScanDataProvider, ScanRunResponse, WebApiErrorCodes, AppContext } from 'service-library';
import { ScanRunBatchRequest, PrivacyScan, AuthenticationType } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { HttpRequest, HttpRequestInit } from '@azure/functions';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { ScanRequestController } from './scan-request-controller';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DataItem {
    url: string;
}

describe(ScanRequestController, () => {
    let scanRequestController: ScanRequestController;
    let appContext: AppContext;
    let scanDataProviderMock: IMock<ScanDataProvider>;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<MockableLogger>;
    let guidGeneratorMock: IMock<GuidGenerator>;

    beforeEach(() => {
        scanDataProviderMock = Mock.ofType<ScanDataProvider>();
        scanDataProviderMock.setup(async (o) => o.writeScanRunBatchRequest(It.isAny(), It.isAny()));

        guidGeneratorMock = Mock.ofType(GuidGenerator);

        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();
        serviceConfigurationMock
            .setup(async (s) => s.getConfigValue('restApiConfig'))
            .returns(async () => {
                return {
                    maxScanRequestBatchCount: 4,
                    minScanPriorityValue: -10,
                    maxScanPriorityValue: 10,
                } as RestApiConfig;
            });
        serviceConfigurationMock
            .setup(async (s) => s.getConfigValue('crawlConfig'))
            .returns(async () => {
                return {
                    deepScanUpperLimit: 2,
                } as CrawlConfig;
            });

        loggerMock = Mock.ofType<MockableLogger>();
    });

    function createContext(body: string): void {
        const funcHttpRequestInit = {
            url: 'http://localhost/',
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            query: { 'api-version': '1.0' },
        } as HttpRequestInit;
        if (body) {
            funcHttpRequestInit.body = { string: body };
        }
        appContext = {
            request: new HttpRequest(funcHttpRequestInit),
        } as AppContext;
    }

    function createScanRequestController(requestBody: any): ScanRequestController {
        createContext(JSON.stringify(requestBody));
        const controller = new ScanRequestController(
            scanDataProviderMock.object,
            guidGeneratorMock.object,
            serviceConfigurationMock.object,
            loggerMock.object,
        );
        controller.appContext = appContext;

        return controller;
    }

    function sortData<T extends DataItem>(array: T[]): T[] {
        return array.sort((a, b) => (a.url > b.url ? 1 : b.url > a.url ? -1 : 0));
    }

    describe(ScanRequestController, () => {
        it('rejects request with large payload', async () => {
            const request = [{ url: '' }, { url: '' }, { url: '' }, { url: '' }, { url: '' }];
            scanRequestController = createScanRequestController(request);

            const response = await scanRequestController.handleRequest();

            expect(response).toEqual(WebHttpResponse.getErrorResponse(WebApiErrorCodes.requestBodyTooLarge));
        });

        it('rejects request with invalid scan notify url', async () => {
            const request = [{ url: 'https://abc/path/', scanNotifyUrl: 'invalid-url' }];
            scanRequestController = createScanRequestController(request);
            const expectedResponse = {
                status: 202,
                jsonBody: [{ url: 'https://abc/path/', error: WebApiErrorCodes.invalidScanNotifyUrl.error }],
            };
            const response = await scanRequestController.handleRequest();

            expect(response).toEqual(expectedResponse);
        });

        it('rejects request with invalid base url', async () => {
            const request = [
                {
                    url: 'https://abc/path/',
                    site: { baseUrl: 'invalid-url' },
                    reportGroups: [{ consolidatedId: 'reportGroupId' }],
                },
            ];
            scanRequestController = createScanRequestController(request);
            const expectedResponse = {
                status: 202,
                jsonBody: [{ url: 'https://abc/path/', error: WebApiErrorCodes.invalidURL.error }],
            };

            const response = await scanRequestController.handleRequest();

            expect(response).toEqual(expectedResponse);
        });

        it("rejects request with invalid 'reportGroups' property", async () => {
            const request = [
                {
                    url: 'https://abc/path/',
                    reportGroups: [{ consolidatedId: '' }], // empty id
                },
            ];
            const expectedResponse = {
                status: 202,
                jsonBody: [{ url: 'https://abc/path/', error: WebApiErrorCodes.invalidReportGroup.error }],
            };
            scanRequestController = createScanRequestController(request);

            const response = await scanRequestController.handleRequest();

            expect(response).toEqual(expectedResponse);
        });

        it('rejects deepScan requests if they are missing required properties', async () => {
            const request = [
                {
                    // missing site
                    deepScan: true,
                    url: 'https://abc/path/',
                },
                {
                    // missing site
                    deepScan: true,
                    url: 'https://def/path/',
                    reportGroups: [{ consolidatedId: 'reportGroupId' }],
                },
            ];
            const expectedResponse = {
                status: 202,
                jsonBody: [
                    { url: 'https://abc/path/', error: WebApiErrorCodes.missingRequiredDeepScanProperties.error },
                    { url: 'https://def/path/', error: WebApiErrorCodes.missingRequiredDeepScanProperties.error },
                ],
            };
            scanRequestController = createScanRequestController(request);

            const response = await scanRequestController.handleRequest();

            // normalize random result order
            const expectedResponseSorted = sortData(expectedResponse.jsonBody);
            const responseSorted = sortData(<ScanRunResponse[]>response.jsonBody);

            expect(responseSorted).toEqual(expectedResponseSorted);
        });

        it('rejects deepScan requests if they are too many known pages', async () => {
            const request = [
                {
                    // too many known pages
                    deepScan: true,
                    url: 'https://base/path/',
                    reportGroups: [{ consolidatedId: 'reportGroupId' }],
                    site: {
                        baseUrl: 'https://base/path',
                        knownPages: ['https://base/path/p1', 'https://base/path/p2', 'https://base/path/p3'],
                    },
                },
            ];
            const expectedResponse = {
                status: 202,
                jsonBody: [{ url: 'https://base/path/', error: WebApiErrorCodes.tooManyKnownPages.error }],
            };
            scanRequestController = createScanRequestController(request);

            const response = await scanRequestController.handleRequest();

            expect(response).toEqual(expectedResponse);
        });

        it('rejects deepScan requests if there is invalid known page URL', async () => {
            const request = [
                {
                    // invalid known page URL
                    deepScan: true,
                    url: 'https://base/path/',
                    reportGroups: [{ consolidatedId: 'reportGroupId' }],
                    site: {
                        baseUrl: 'https://base/path',
                        knownPages: ['https://base/path/p1', 'invalid " url'],
                    },
                },
            ];
            const expectedResponse = {
                status: 202,
                jsonBody: [{ url: 'https://base/path/', error: WebApiErrorCodes.invalidKnownPageURL.error }],
            };
            scanRequestController = createScanRequestController(request);

            const response = await scanRequestController.handleRequest();

            expect(response).toEqual(expectedResponse);
        });

        it('accepts valid request only', async () => {
            const guid1 = '1e9cefa6-538a-6df0-aaaa-ffffffffffff';
            const guid2 = '1e9cefa6-538a-6df0-bbbb-ffffffffffff';
            guidGeneratorMock.setup((g) => g.createGuid()).returns(() => guid1);
            guidGeneratorMock.setup((g) => g.createGuidFromBaseGuid(guid1)).returns(() => guid2);
            const request = [
                {
                    url: 'https://abs/path/',
                    priority: 1,
                    scanNotifyUrl: 'https://notify/path/',
                    site: {
                        baseUrl: 'https://base/path',
                        knownPages: ['https://base/path/known1', 'https://base/path/known2'],
                        discoveryPatterns: ['pattern1', 'pattern2'],
                    },
                    reportGroups: [{ consolidatedId: 'reportGroupId' }],
                    deepScan: true,
                    scanDefinitions: [{ name: 'accessibility-agent', args: { arg1: 'arg1' } }],
                }, // valid request
                { url: '/invalid/url' }, // invalid URL
                { url: 'https://cde/path/', priority: 9999 }, // invalid priority range
            ];
            const expectedResponse = {
                status: 202,
                jsonBody: [
                    { scanId: guid2, url: 'https://abs/path/' },
                    { url: '/invalid/url', error: WebApiErrorCodes.invalidURL.error },
                    { url: 'https://cde/path/', error: WebApiErrorCodes.outOfRangePriority.error },
                ],
            };
            const expectedSavedRequest: ScanRunBatchRequest[] = [
                {
                    scanId: guid2,
                    url: 'https://abs/path/',
                    priority: 1,
                    scanNotifyUrl: 'https://notify/path/',
                    site: {
                        baseUrl: 'https://base/path',
                        knownPages: ['https://base/path/known1', 'https://base/path/known2'],
                        discoveryPatterns: ['pattern1', 'pattern2'],
                    },
                    reportGroups: [{ consolidatedId: 'reportGroupId' }],
                    deepScan: true,
                    scanDefinitions: [{ name: 'accessibility-agent', args: { arg1: 'arg1' } }],
                },
            ];
            scanDataProviderMock.setup(async (o) => o.writeScanRunBatchRequest(guid1, expectedSavedRequest)).verifiable(Times.once());
            scanRequestController = createScanRequestController(request);

            const response = await scanRequestController.handleRequest();

            // normalize random result order
            const expectedResponseSorted = sortData(expectedResponse.jsonBody);
            const responseSorted = sortData(<ScanRunResponse[]>response.jsonBody);

            expect(response.status).toEqual(202);
            expect(responseSorted).toEqual(expectedResponseSorted);
            scanDataProviderMock.verifyAll();
            guidGeneratorMock.verifyAll();
        });

        it.each(['entraId', undefined])('accepts request with authenticationType = %s', async (authenticationType: AuthenticationType) => {
            const priority = 10;
            const guid1 = '1e9cefa6-538a-6df0-aaaa-ffffffffffff';
            const guid2 = '1e9cefa6-538a-6df0-bbbb-ffffffffffff';
            guidGeneratorMock.setup((g) => g.createGuid()).returns(() => guid1);
            guidGeneratorMock.setup((g) => g.createGuidFromBaseGuid(guid1)).returns(() => guid2);
            const request = [{ url: 'https://abs/path/', priority: priority, authenticationType }];
            const expectedResponse = {
                status: 202,
                jsonBody: [{ scanId: guid2, url: 'https://abs/path/' }],
            };
            const expectedSavedRequest: ScanRunBatchRequest[] = authenticationType
                ? [{ scanId: guid2, url: 'https://abs/path/', priority: priority, authenticationType }]
                : [{ scanId: guid2, url: 'https://abs/path/', priority: priority }];
            scanDataProviderMock.setup(async (o) => o.writeScanRunBatchRequest(guid1, expectedSavedRequest)).verifiable(Times.once());
            scanRequestController = createScanRequestController(request);

            const response = await scanRequestController.handleRequest();

            expect(response).toEqual(expectedResponse);
            scanDataProviderMock.verifyAll();
            guidGeneratorMock.verifyAll();
        });

        it('accepts request with priority', async () => {
            const priority = 10;
            const guid1 = '1e9cefa6-538a-6df0-aaaa-ffffffffffff';
            const guid2 = '1e9cefa6-538a-6df0-bbbb-ffffffffffff';
            guidGeneratorMock.setup((g) => g.createGuid()).returns(() => guid1);
            guidGeneratorMock.setup((g) => g.createGuidFromBaseGuid(guid1)).returns(() => guid2);
            const request = [{ url: 'https://abs/path/', priority: priority }];
            const expectedResponse = {
                status: 202,
                jsonBody: [{ scanId: guid2, url: 'https://abs/path/' }],
            };
            const expectedSavedRequest: ScanRunBatchRequest[] = [{ scanId: guid2, url: 'https://abs/path/', priority: priority }];
            scanDataProviderMock.setup(async (o) => o.writeScanRunBatchRequest(guid1, expectedSavedRequest)).verifiable(Times.once());
            scanRequestController = createScanRequestController(request);

            const response = await scanRequestController.handleRequest();

            expect(response).toEqual(expectedResponse);
            scanDataProviderMock.verifyAll();
            guidGeneratorMock.verifyAll();
        });

        it.each([{ cookieBannerType: 'standard' }, undefined])('accepts request with privacyScan=%s', async (privacyScan: PrivacyScan) => {
            const guid1 = '1e9cefa6-538a-6df0-aaaa-ffffffffffff';
            const guid2 = '1e9cefa6-538a-6df0-bbbb-ffffffffffff';
            guidGeneratorMock.setup((g) => g.createGuid()).returns(() => guid1);
            guidGeneratorMock.setup((g) => g.createGuidFromBaseGuid(guid1)).returns(() => guid2);
            const request = [{ url: 'https://abs/path/', privacyScan }];
            const expectedResponse = {
                status: 202,
                jsonBody: [{ scanId: guid2, url: 'https://abs/path/' }],
            };
            const expectedSavedRequest: ScanRunBatchRequest[] = privacyScan
                ? [{ scanId: guid2, url: 'https://abs/path/', priority: 0, privacyScan }]
                : [{ scanId: guid2, url: 'https://abs/path/', priority: 0 }];
            scanDataProviderMock.setup(async (o) => o.writeScanRunBatchRequest(guid1, expectedSavedRequest)).verifiable(Times.once());
            scanRequestController = createScanRequestController(request);

            const response = await scanRequestController.handleRequest();

            expect(response).toEqual(expectedResponse);
            scanDataProviderMock.verifyAll();
            guidGeneratorMock.verifyAll();
        });

        it('sends telemetry event', async () => {
            const guid1 = '1e9cefa6-538a-6df0-aaaa-ffffffffffff';
            const guid2 = '1e9cefa6-538a-6df0-bbbb-ffffffffffff';
            guidGeneratorMock.setup((g) => g.createGuid()).returns(() => guid1);
            guidGeneratorMock.setup((g) => g.createGuidFromBaseGuid(guid1)).returns(() => guid2);
            const request = [
                { url: 'https://abs/path/', priority: 1 }, // valid request
                { url: '/invalid/url' }, // invalid URL
                { url: 'https://cde/path/', priority: 9999 }, // invalid priority range
            ];
            const expectedMeasurements: ScanRequestReceivedMeasurements = {
                totalScanRequests: 3,
                pendingScanRequests: 1,
                rejectedScanRequests: 2,
            };
            loggerMock.setup((lm) => lm.trackEvent('ScanRequestReceived', null, expectedMeasurements)).verifiable();
            scanRequestController = createScanRequestController(request);

            await scanRequestController.handleRequest();

            loggerMock.verifyAll();
        });
    });
});
