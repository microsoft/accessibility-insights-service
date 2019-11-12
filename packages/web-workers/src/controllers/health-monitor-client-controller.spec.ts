// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ServiceConfiguration } from 'common';
import { ContextAwareLogger } from 'logger';
import { ScanResultResponse, ScanRun, ScanRunResponse } from 'service-library';
import { IMock, It, Mock, Times } from 'typemoq';
import { A11yServiceClient, ResponseWithBodyType } from 'web-api-client';
import { ActivityAction } from '../contracts/activity-actions';
import { ActivityRequestData } from './activity-request-data';
import { HealthMonitorClientController } from './health-monitor-client-controller';

// tslint:disable:no-object-literal-type-assertion no-any no-unsafe-any

describe(HealthMonitorClientController, () => {
    let testSubject: HealthMonitorClientController;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let contextAwareLoggerMock: IMock<ContextAwareLogger>;
    let context: Context;
    let webApiClientMock: IMock<A11yServiceClient>;
    let jsonResponse: any;
    let expectedResponse: ResponseWithBodyType<any>;

    beforeEach(() => {
        serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
        contextAwareLoggerMock = Mock.ofType(ContextAwareLogger);
        webApiClientMock = Mock.ofType(A11yServiceClient);
        context = <Context>(<unknown>{ bindingDefinitions: {}, bindings: {} });

        jsonResponse = { testResponse: true } as any;
        expectedResponse = {
            body: 'some body content',
            toJSON: () => {
                return jsonResponse;
            },
        } as ResponseWithBodyType<any>;

        testSubject = new HealthMonitorClientController(serviceConfigurationMock.object, contextAwareLoggerMock.object, async () =>
            Promise.resolve(webApiClientMock.object),
        );
    });

    afterEach(() => {
        webApiClientMock.verifyAll();
        contextAwareLoggerMock.verifyAll();
    });

    describe('invoke', () => {
        it('handles createScanRequest', async () => {
            const scanUrl = 'scan-url';
            webApiClientMock
                .setup(async w => w.postScanUrl(scanUrl, 1))
                .returns(async () => Promise.resolve(expectedResponse))
                .verifiable(Times.once());

            const args: ActivityRequestData = {
                activityName: ActivityAction.createScanRequest,
                data: {
                    scanUrl: scanUrl,
                    priority: 1,
                },
            };
            const result = await testSubject.invoke(context, args);
            expect(result).toEqual(jsonResponse);
        });

        it('handles getScanResult', async () => {
            const scanUrl = 'scan-url';
            const scanId = 'scan-id';
            webApiClientMock
                .setup(async w => w.getScanStatus(scanId))
                .returns(async () => Promise.resolve(expectedResponse))
                .verifiable(Times.once());

            const args: ActivityRequestData = {
                activityName: ActivityAction.getScanResult,
                data: {
                    scanId: scanId,
                },
            };
            const result = await testSubject.invoke(context, args);
            expect(result).toEqual(jsonResponse);
        });

        it('handles getScanReport', async () => {
            const scanId = 'scan-id';
            const reportId = 'report-id';
            webApiClientMock
                .setup(async w => w.getScanReport(scanId, reportId))
                .returns(async () => Promise.resolve(expectedResponse))
                .verifiable(Times.once());

            const args: ActivityRequestData = {
                activityName: ActivityAction.getScanReport,
                data: {
                    scanId: scanId,
                    reportId: reportId,
                },
            };
            const result = await testSubject.invoke(context, args);
            expect(result).toEqual(jsonResponse);
            expect(expectedResponse.body).toBeUndefined();
        });

        it('handles getHealthStatus', async () => {
            webApiClientMock
                .setup(async w => w.checkHealth())
                .returns(async () => Promise.resolve(expectedResponse))
                .verifiable(Times.once());

            const args: ActivityRequestData = {
                activityName: ActivityAction.getHealthStatus,
            };
            const result = await testSubject.invoke(context, args);
        });
    });
});
