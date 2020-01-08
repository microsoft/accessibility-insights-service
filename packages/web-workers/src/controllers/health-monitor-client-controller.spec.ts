// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { GuidGenerator, ServiceConfiguration } from 'common';
import { IMock, Mock, Times } from 'typemoq';
import { A11yServiceClient, ResponseWithBodyType } from 'web-api-client';

import { FunctionalTestGroup, FunctionalTestGroupFactory, TestContextData, TestEnvironment } from 'functional-tests';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import { ActivityAction } from '../contracts/activity-actions';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { ActivityRequestData, RunFunctionalTestGroupData, TrackAvailabilityData } from './activity-request-data';
import { HealthMonitorClientController } from './health-monitor-client-controller';

// tslint:disable:no-object-literal-type-assertion no-any no-unsafe-any

class FunctionalTestGroupStub extends FunctionalTestGroup {
    public async run(testContextData: TestContextData, env: TestEnvironment): Promise<TestContextData> {
        return testContextData;
    }

    // tslint:disable-next-line:no-empty
    protected registerTestCases(env: TestEnvironment): void {}
}

describe(HealthMonitorClientController, () => {
    let testSubject: HealthMonitorClientController;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<MockableLogger>;
    let context: Context;
    let webApiClientMock: IMock<A11yServiceClient>;
    let jsonResponse: any;
    let expectedResponse: ResponseWithBodyType<any>;
    let functionalTestGroupFactoryMock: IMock<FunctionalTestGroupFactory>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let functionalTestGroupStub: FunctionalTestGroupStub;

    beforeEach(() => {
        serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
        loggerMock = Mock.ofType(MockableLogger);
        webApiClientMock = Mock.ofType(A11yServiceClient);
        functionalTestGroupFactoryMock = Mock.ofType(FunctionalTestGroupFactory);
        guidGeneratorMock = Mock.ofType(GuidGenerator);
        onDemandPageScanRunResultProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider);
        context = <Context>(<unknown>{ bindingDefinitions: {}, bindings: {} });
        functionalTestGroupStub = new FunctionalTestGroupStub(
            webApiClientMock.object,
            onDemandPageScanRunResultProviderMock.object,
            guidGeneratorMock.object,
        );

        jsonResponse = { testResponse: true } as any;
        expectedResponse = {
            body: 'some body content',
            toJSON: () => {
                return jsonResponse;
            },
        } as ResponseWithBodyType<any>;

        testSubject = new HealthMonitorClientController(
            serviceConfigurationMock.object,
            loggerMock.object,
            async () => Promise.resolve(webApiClientMock.object),
            functionalTestGroupFactoryMock.object,
        );
    });

    afterEach(() => {
        webApiClientMock.verifyAll();
        loggerMock.verifyAll();
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
            await testSubject.invoke(context, args);
        });

        it('handles trackAvailability', async () => {
            const data: TrackAvailabilityData = {
                name: 'track availability data name',
                telemetry: 'availability telemetry' as any,
            };
            loggerMock.setup(async l => l.trackAvailability(data.name, data.telemetry)).verifiable(Times.once());

            const args: ActivityRequestData = {
                activityName: ActivityAction.trackAvailability,
                data: data,
            };
            await testSubject.invoke(context, args);
        });

        it('handles runFunctionalTestGroup', async () => {
            const data: RunFunctionalTestGroupData = {
                testGroupName: 'PostScan',
                testContextData: {
                    scanUrl: 'scanUrl',
                },
                env: TestEnvironment.canary,
            };
            const args: ActivityRequestData = {
                activityName: ActivityAction.runFunctionalTestGroup,
                data: data,
            };

            functionalTestGroupFactoryMock
                .setup(async f => f.createFunctionalTestGroup(data.testGroupName, loggerMock.object))
                .returns(async () => Promise.resolve(functionalTestGroupStub))
                .verifiable();

            const result = await testSubject.invoke(context, args);
            functionalTestGroupFactoryMock.verifyAll();
            expect(result).toEqual(data.testContextData);
        });
    });
});
