// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ServiceConfiguration } from 'common';
import { ContextAwareLogger } from 'logger';
import { ScanResultResponse } from 'service-library';
import { IMock, It, Mock, Times } from 'typemoq';
import { A11yServiceClient } from 'web-api-client';
import { ActivityAction } from '../contracts/activity-actions';
import { ActivityRequestData, CreateScanRequestData, GetScanReportData, GetScanResultData } from './activity-request-data';
import { HealthMonitorClientController } from './health-monitor-client-controller';

describe(HealthMonitorClientController, () => {
    let testSubject: HealthMonitorClientController;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let contextAwareLoggerMock: IMock<ContextAwareLogger>;
    let context: Context;
    let webApiClientMock: IMock<A11yServiceClient>;

    beforeEach(() => {
        serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
        contextAwareLoggerMock = Mock.ofType(ContextAwareLogger);
        webApiClientMock = Mock.ofType(A11yServiceClient);
        context = <Context>(<unknown>{ bindingDefinitions: {}, bindings: {} });

        testSubject = new HealthMonitorClientController(
            serviceConfigurationMock.object,
            contextAwareLoggerMock.object,
            webApiClientMock.object,
        );
    });

    afterEach(() => {
        webApiClientMock.verifyAll();
        contextAwareLoggerMock.verifyAll();
    });

    describe('invoke', () => {
        it('handles createScanRequest', async () => {
            const scanUrl = 'scan-url';
            const expectedResult = { scanId: 'scan-id', url: scanUrl };
            webApiClientMock
                .setup(async w => w.postScanUrl(scanUrl, 1))
                .returns(async () => Promise.resolve(expectedResult))
                .verifiable(Times.once());

            const args: ActivityRequestData = {
                activityName: ActivityAction.createScanRequest,
                data: {
                    scanUrl: scanUrl,
                    priority: 1,
                },
            };
            const result = await testSubject.invoke(context, args);
            expect(result).toEqual(expectedResult);
        });

        it('handles getScanResult', async () => {
            const scanUrl = 'scan-url';
            const scanId = 'scan-id';
            const expectedResult: ScanResultResponse = {
                scanId: scanId,
                url: scanUrl,
                run: { state: 'pending' }
            };
            webApiClientMock
                .setup(async w => w.getScanStatus(scanId))
                .returns(async () => Promise.resolve(expectedResult))
                .verifiable(Times.once());

            const args: ActivityRequestData = {
                activityName: ActivityAction.getScanResult,
                data: {
                    scanId: scanId
                },
            };
            const result = await testSubject.invoke(context, args);
            expect(result).toEqual(expectedResult);
        });

        it('handles getScanReport', async () => {
            const scanId = 'scan-id';
            const reportId = 'report-id';
            const expectedResult: Buffer = new Buffer('Scan report');
            webApiClientMock
                .setup(async w => w.getScanReport(scanId, reportId))
                .returns(async () => Promise.resolve(expectedResult))
                .verifiable(Times.once());

            const args: ActivityRequestData = {
                activityName: ActivityAction.getScanReport,
                data: {
                    scanId: scanId,
                    reportId: reportId,
                },
            };
            const result = await testSubject.invoke(context, args);
            expect(result).toEqual(expectedResult);
        });
    });
});
