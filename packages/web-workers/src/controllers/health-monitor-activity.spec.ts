// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GuidGenerator, ResponseWithBodyType, ServiceConfiguration } from 'common';
import { FunctionalTestGroup, TestContextData, TestEnvironment, TestGroupConstructor, TestRunMetadata, TestRunner } from 'functional-tests';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import { IMock, It, Mock, Times } from 'typemoq';
import { A11yServiceClient } from 'web-api-client';
import { InvocationContext } from '@azure/functions';
import { ActivityAction } from '../contracts/activity-actions';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { ActivityRequestData, LogTestRunStartData, RunFunctionalTestGroupData, TrackAvailabilityData } from './activity-request-data';
import { WebApiConfig } from './web-api-config';
import { HealthMonitorActivity } from './health-monitor-activity';

/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any */

class FunctionalTestGroupStub extends FunctionalTestGroup {
    public declare testContextData: TestContextData;

    public async run(testContextData: TestContextData, env: TestEnvironment): Promise<TestContextData> {
        return testContextData;
    }

    public setTestContext(testContextData: TestContextData): void {
        this.testContextData = testContextData;
    }

    // eslint-disable-next-line no-empty, @typescript-eslint/no-empty-function
    protected registerTestCases(env: TestEnvironment): void {}
}

describe(HealthMonitorActivity, () => {
    let testSubject: HealthMonitorActivity;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<MockableLogger>;
    let webApiClientMock: IMock<A11yServiceClient>;
    let jsonResponse: any;
    let expectedResponse: ResponseWithBodyType<any>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let testRunnerMock: IMock<TestRunner>;
    let context: InvocationContext;

    const testGroupTypes: { [key: string]: TestGroupConstructor } = {
        PostScan: FunctionalTestGroupStub,
    };
    const releaseId = 'release id';
    const runId = 'run id';
    const scenarioName = 'test scenario';
    const serializeResponseStub = (response: ResponseWithBodyType) => jsonResponse;

    beforeEach(() => {
        serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
        loggerMock = Mock.ofType(MockableLogger);
        webApiClientMock = Mock.ofType(A11yServiceClient);
        guidGeneratorMock = Mock.ofType(GuidGenerator);
        onDemandPageScanRunResultProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider);
        testRunnerMock = Mock.ofType(TestRunner);

        context = {} as InvocationContext;
        jsonResponse = { testResponse: true } as any;
        expectedResponse = {
            body: 'some body content',
        } as ResponseWithBodyType<any>;

        testSubject = new HealthMonitorActivity(
            serviceConfigurationMock.object,
            loggerMock.object,
            async () => Promise.resolve(webApiClientMock.object),
            onDemandPageScanRunResultProviderMock.object,
            guidGeneratorMock.object,
            testRunnerMock.object,
            testGroupTypes,
            serializeResponseStub,
        );
    });

    afterEach(() => {
        webApiClientMock.verifyAll();
        loggerMock.verifyAll();
    });

    describe('invoke', () => {
        it('handles createScanRequest', async () => {
            const scanUrl = 'scan-url';
            const priority = 1;
            const scanNotifyUrl = 'some-notify-url';
            const scanOptions = { scanNotificationUrl: scanNotifyUrl, priority };
            webApiClientMock
                .setup(async (w) => w.postScanUrl(scanUrl, scanOptions))
                .returns(async () => Promise.resolve(expectedResponse))
                .verifiable(Times.once());

            const args: ActivityRequestData = {
                activityName: ActivityAction.createScanRequest,
                data: {
                    scanUrl: scanUrl,
                    scanOptions: scanOptions,
                },
            };
            const result = await testSubject.handler(args, context);
            expect(result).toEqual(jsonResponse);
        });

        it('handles getScanResult', async () => {
            const scanId = 'scan-id';
            webApiClientMock
                .setup(async (w) => w.getScanStatus(scanId))
                .returns(async () => Promise.resolve(expectedResponse))
                .verifiable(Times.once());

            const args: ActivityRequestData = {
                activityName: ActivityAction.getScanResult,
                data: {
                    scanId: scanId,
                },
            };
            const result = await testSubject.handler(args, context);
            expect(result).toEqual(jsonResponse);
        });

        it('handles getScanReport', async () => {
            const scanId = 'scan-id';
            const reportId = 'report-id';
            webApiClientMock
                .setup(async (w) => w.getScanReport(scanId, reportId))
                .returns(async () => Promise.resolve(expectedResponse))
                .verifiable(Times.once());

            const args: ActivityRequestData = {
                activityName: ActivityAction.getScanReport,
                data: {
                    scanId: scanId,
                    reportId: reportId,
                },
            };
            const result = await testSubject.handler(args, context);
            expect(result).toEqual(jsonResponse);
            expect(expectedResponse.body).toBeUndefined();
        });

        it('handles getHealthStatus', async () => {
            webApiClientMock
                .setup(async (w) => w.checkHealth())
                .returns(async () => Promise.resolve(expectedResponse))
                .verifiable(Times.once());

            const args: ActivityRequestData = {
                activityName: ActivityAction.getHealthStatus,
            };
            await testSubject.handler(args, context);
        });

        it('handles trackAvailability', async () => {
            const data: TrackAvailabilityData = {
                name: 'track availability data name',
                telemetry: 'availability telemetry' as any,
            };
            loggerMock.setup(async (l) => l.trackAvailability(data.name, data.telemetry)).verifiable(Times.once());

            const args: ActivityRequestData = {
                activityName: ActivityAction.trackAvailability,
                data: data,
            };
            await testSubject.handler(args, context);
        });

        it('handles runFunctionalTestGroup', async () => {
            const scanId = 'scan id';
            const data: RunFunctionalTestGroupData = {
                runId: runId,
                releaseId: releaseId,
                test: {
                    testGroupName: 'PostScan',
                    scenarioName: scenarioName,
                },
                testContextData: {
                    scanUrl: 'scanUrl',
                    scanId: scanId,
                },
                environment: TestEnvironment.canary,
            };
            const args: ActivityRequestData = {
                activityName: ActivityAction.runFunctionalTestGroup,
                data: data,
            };
            const expectedTestMetadata: TestRunMetadata = {
                environment: TestEnvironment.canary,
                releaseId: releaseId,
                runId: runId,
                scenarioName: scenarioName,
                scanId: scanId,
            };

            let testContainer: any;
            testRunnerMock.setup((t) => t.setLogger(loggerMock.object)).verifiable(Times.once());
            testRunnerMock
                .setup(async (t) => t.run(It.isAny(), expectedTestMetadata))
                .callback((testGroup) => {
                    testContainer = testGroup;
                })
                .verifiable(Times.once());

            await testSubject.handler(args, context);

            const functionalTestGroupStub = testContainer as FunctionalTestGroupStub;
            expect(functionalTestGroupStub).toBeDefined();
            expect(functionalTestGroupStub.testContextData).toEqual(data.testContextData);
            testRunnerMock.verifyAll();
        });

        it('handles LogTestGroupStart', async () => {
            const data: LogTestRunStartData = {
                runId: runId,
                releaseId: releaseId,
                testsToRun: [
                    {
                        testGroupName: 'PostScan',
                        scenarioName: scenarioName,
                    },
                    {
                        testGroupName: 'ScanStatus',
                        scenarioName: scenarioName,
                    },
                ],
                environmentName: 'canary',
            };
            const args: ActivityRequestData = {
                activityName: ActivityAction.logTestRunStart,
                data: data,
            };
            const expectedFormattedTestList = [
                {
                    testGroupName: 'PostScanTestGroup',
                    scenarioName: scenarioName,
                },
                {
                    testGroupName: 'ScanStatusTestGroup',
                    scenarioName: scenarioName,
                },
            ];
            const expectedLogProperties = {
                source: 'BeginTestSuite',
                functionalTestGroups: JSON.stringify(expectedFormattedTestList),
                runId: runId,
                releaseId: releaseId,
                environment: data.environmentName,
            };
            loggerMock.setup((l) => l.trackEvent('FunctionalTest', expectedLogProperties)).verifiable();

            await testSubject.handler(args, context);
        });

        it('handles getWebApiConfig', async () => {
            const expectedConfig: WebApiConfig = {
                releaseId: 'release id',
                baseUrl: 'base url',
            };
            process.env.RELEASE_VERSION = expectedConfig.releaseId;
            process.env.WEB_API_BASE_URL = expectedConfig.baseUrl;
            const args: ActivityRequestData = {
                activityName: ActivityAction.getWebApiConfig,
            };

            const result = await testSubject.handler(args, context);
            expect(result).toEqual(expectedConfig);
        });
    });
});
