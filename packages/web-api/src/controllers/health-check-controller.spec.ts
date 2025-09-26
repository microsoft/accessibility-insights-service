// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ApplicationInsightsClient, ApplicationInsightsQueryResponse } from 'azure-services';
import { AvailabilityTestConfig, ResponseWithBodyType, ServiceConfiguration } from 'common';
import { HealthReport, WebHttpResponse, WebApiErrorCodes, AppContext } from 'service-library';
import { IMock, It, Mock } from 'typemoq';
import { HttpRequest, HttpRequestInit } from '@azure/functions';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { createHealthCheckQueryForRelease } from '../health-check-query';
import { HealthCheckController, HealthTarget } from './health-check-controller';

/* eslint-disable @typescript-eslint/no-explicit-any, max-len */

describe(HealthCheckController, () => {
    const releaseTarget: HealthTarget = 'release';
    const releaseId = '2419';
    const queryStringStub = 'query string stub';
    let healthCheckController: HealthCheckController;
    let appContext: AppContext;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<MockableLogger>;
    let appInsightsClientMock: IMock<ApplicationInsightsClient>;
    let availabilityTestConfig: AvailabilityTestConfig;
    let createQueryMock: IMock<typeof createHealthCheckQueryForRelease>;

    beforeEach(() => {
        process.env.RELEASE_VERSION = releaseId;

        availabilityTestConfig = {
            scanWaitIntervalInSeconds: 10,
            maxScanWaitTimeInSeconds: 20,
            urlToScan: 'https://www.bing.com',
            logQueryTimeRange: 'P1D',
            environmentDefinition: 'canary',
            consolidatedIdBase: 'some-report-id',
            maxDeepScanWaitTimeInSeconds: 40,
        };

        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();
        serviceConfigurationMock
            .setup(async (s) => s.getConfigValue('availabilityTestConfig'))
            .returns(async () => Promise.resolve(availabilityTestConfig));

        loggerMock = Mock.ofType<MockableLogger>();
        appInsightsClientMock = Mock.ofType(ApplicationInsightsClient);
        createQueryMock = Mock.ofInstance(() => null);
        createQueryMock.setup((c) => c(releaseId)).returns(() => queryStringStub);

        healthCheckController = new HealthCheckController(
            serviceConfigurationMock.object,
            loggerMock.object,
            async () => Promise.resolve(appInsightsClientMock.object),
            createQueryMock.object,
        );
    });

    function createContext(urlParams: any): void {
        const funcHttpRequestInit = {
            url: 'http://localhost/',
            method: 'GET',
            headers: { 'content-type': 'application/json' },
            query: { 'api-version': '1.0' },
            params: {
                ...urlParams,
            },
        } as HttpRequestInit;
        appContext = {
            request: new HttpRequest(funcHttpRequestInit),
        } as AppContext;

        healthCheckController.appContext = appContext;
    }

    it('return echo health request', async () => {
        createContext({ nan: '1' });
        const response = await healthCheckController.handleRequest();

        expect(response).toEqual({ status: 200 });
        loggerMock.verifyAll();
    });

    it('return not found for unknown target request', async () => {
        createContext({ target: 'other' });
        const response = await healthCheckController.handleRequest();

        expect(response).toEqual(WebHttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound));
        loggerMock.verifyAll();
    });

    it('return missing release version when default version is unknown', async () => {
        delete process.env.RELEASE_VERSION;
        createContext({ target: releaseTarget });
        const response = await healthCheckController.handleRequest();

        expect(response).toEqual(WebHttpResponse.getErrorResponse(WebApiErrorCodes.missingReleaseVersion));
        loggerMock.verifyAll();
    });

    it('return internal error on app insights failure', async () => {
        createContext({ target: releaseTarget });
        const failureResponse: ResponseWithBodyType<ApplicationInsightsQueryResponse> = {
            statusCode: 404,
            body: undefined,
        } as any as ResponseWithBodyType<ApplicationInsightsQueryResponse>;
        setupAppInsightsResponse(failureResponse);

        const response = await healthCheckController.handleRequest();

        expect(response).toEqual(WebHttpResponse.getErrorResponse(WebApiErrorCodes.internalError));
        appInsightsClientMock.verifyAll();
    });

    it('returns correct health report', async () => {
        createContext({ target: releaseTarget, targetId: releaseId });
        const responseBody: ApplicationInsightsQueryResponse = {
            tables: [
                {
                    columns: [
                        { name: 'timestamp', type: 'datetime' },
                        { name: 'environment', type: 'dynamic' },
                        { name: 'releaseId', type: 'dynamic' },
                        { name: 'runId', type: 'dynamic' },
                        { name: 'logSource', type: 'dynamic' },
                        { name: 'testContainer', type: 'dynamic' },
                        { name: 'testName', type: 'dynamic' },
                        { name: 'result', type: 'dynamic' },
                        { name: 'scenarioName', type: 'dynamic' },
                        { name: 'scanId', type: 'dynamic' },
                        { name: 'error', type: 'dynamic' },
                    ],
                    rows: [
                        [
                            '2020-01-13T03:11:00.352Z',
                            'canary',
                            '2419',
                            '1ea35b25-3238-68f0-774d-7c98f231af4f',
                            'TestRun',
                            'ValidationATestGroup',
                            'testA1',
                            'pass',
                            'TestScenario1',
                            'scan-id-1',
                        ],
                        [
                            '2020-01-13T03:11:00.352Z',
                            'canary',
                            '2419',
                            '1ea35b25-3238-68f0-774d-7c98f231af4f',
                            'TestRun',
                            'ValidationBTestGroup',
                            'testB1',
                            'pass',
                            'TestScenario1',
                            'scan-id-1',
                        ],
                        [
                            '2020-01-13T03:11:00.352Z',
                            'canary',
                            '2419',
                            '1ea35b25-3238-68f0-774d-7c98f231af4f',
                            'TestRun',
                            'FinalizerTestGroup',
                            'functionalTestsFinalizer',
                            'pass',
                            'FinalizerScenario',
                        ],
                        [
                            '2020-01-13T03:11:00.352Z',
                            'canary',
                            '2419',
                            '1ea35b25-3238-68f0-774d-7c98f231af4f',
                            'TestRun',
                            'ValidationATestGroup',
                            'testA3',
                            'fail',
                            'TestScenario2',
                            'scan-id-2',
                            'error from test A3',
                        ],
                    ],
                    name: 'PrimaryResult',
                },
            ],
        };
        const successResponse: ResponseWithBodyType<ApplicationInsightsQueryResponse> = {
            statusCode: 200,
            body: responseBody,
        } as any as ResponseWithBodyType<ApplicationInsightsQueryResponse>;
        setupAppInsightsResponse(successResponse);

        const expectedResponseBody: HealthReport = {
            healthStatus: 'fail',
            environment: 'canary',
            releaseId: '2419',
            runId: '1ea35b25-3238-68f0-774d-7c98f231af4f',
            testRuns: [
                {
                    testContainer: 'ValidationATestGroup',
                    testName: 'testA1',
                    scenarioName: 'TestScenario1',
                    scanId: 'scan-id-1',
                    result: 'pass',
                    timestamp: new Date('2020-01-13T03:11:00.352Z'),
                },
                {
                    testContainer: 'ValidationBTestGroup',
                    testName: 'testB1',
                    scenarioName: 'TestScenario1',
                    scanId: 'scan-id-1',
                    result: 'pass',
                    timestamp: new Date('2020-01-13T03:11:00.352Z'),
                },
                {
                    testContainer: 'FinalizerTestGroup',
                    testName: 'functionalTestsFinalizer',
                    scenarioName: 'FinalizerScenario',
                    result: 'pass',
                    timestamp: new Date('2020-01-13T03:11:00.352Z'),
                },
                {
                    testContainer: 'ValidationATestGroup',
                    testName: 'testA3',
                    scenarioName: 'TestScenario2',
                    scanId: 'scan-id-2',
                    result: 'fail',
                    timestamp: new Date('2020-01-13T03:11:00.352Z'),
                    error: 'error from test A3',
                },
            ],
            testsPassed: 3,
            testsFailed: 1,
        };

        const response = await healthCheckController.handleRequest();

        expect(response.status).toEqual(200);
        expect(response.jsonBody).toEqual(expectedResponseBody);
        appInsightsClientMock.verifyAll();
    });

    it('returns warn health report result when no test result found', async () => {
        createContext({ target: releaseTarget, targetId: releaseId });
        const responseBody: ApplicationInsightsQueryResponse = {
            tables: [
                {
                    columns: [
                        { name: 'timestamp', type: 'datetime' },
                        { name: 'environment', type: 'dynamic' },
                        { name: 'releaseId', type: 'dynamic' },
                        { name: 'runId', type: 'dynamic' },
                        { name: 'logSource', type: 'dynamic' },
                        { name: 'testContainer', type: 'dynamic' },
                        { name: 'testName', type: 'dynamic' },
                        { name: 'result', type: 'dynamic' },
                        { name: 'error', type: 'dynamic' },
                    ],
                    rows: [],
                    name: 'PrimaryResult',
                },
            ],
        };
        const successResponse: ResponseWithBodyType<ApplicationInsightsQueryResponse> = {
            statusCode: 200,
            body: responseBody,
        } as any as ResponseWithBodyType<ApplicationInsightsQueryResponse>;
        setupAppInsightsResponse(successResponse, queryStringStub);

        const expectedResponseBody: HealthReport = {
            healthStatus: 'warn',
            environment: undefined,
            releaseId: '2419',
            runId: undefined,
            testRuns: [],
            testsPassed: 0,
            testsFailed: 0,
        };

        const response = await healthCheckController.handleRequest();

        expect(response.status).toEqual(200);
        expect(response.jsonBody).toEqual(expectedResponseBody);
        appInsightsClientMock.verifyAll();
    });

    function setupAppInsightsResponse(response: ResponseWithBodyType<ApplicationInsightsQueryResponse>, query = It.isAny()): void {
        appInsightsClientMock
            .setup(async (a) => a.executeQuery(query, It.isAny()))
            .returns(async () => response)
            .verifiable();
    }
});
