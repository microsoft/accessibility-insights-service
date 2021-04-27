// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AvailabilityTestConfig, SerializableResponse } from 'common';
// eslint-disable-next-line import/no-internal-modules
import { DurableOrchestrationContext, IOrchestrationFunctionContext } from 'durable-functions/lib/src/classes';
import { IMock, It, Mock, MockBehavior } from 'typemoq';
import { ScanRunResponse, ScanRunResultResponse, WebApiError } from 'service-library';
import { PostScanRequestOptions } from 'web-api-client';
import { TestContextData, TestGroupName } from 'functional-tests';
import { ActivityAction } from '../contracts/activity-actions';
import { GeneratorExecutor } from '../test-utilities/generator-executor';
import { generatorStub } from '../test-utilities/generator-function';
import {
    ActivityRequestData,
    CreateScanRequestData,
    LogTestRunStartData,
    RunFunctionalTestGroupData,
    TestIdentifier,
} from '../controllers/activity-request-data';
import { WebApiConfig } from '../controllers/web-api-config';
import { OrchestrationSteps } from './orchestration-steps';
import { ActivityActionDispatcher } from './activity-action-dispatcher';
import { ScanWaitOrchestrator } from './scan-wait-orchestrator';
import { OrchestrationLogger } from './orchestration-logger';
import { ScanWaitConditions } from './scan-wait-conditions';

const orchestrationInstanceId = 'orchestration instance Id';

describe(OrchestrationSteps, () => {
    let context: IOrchestrationFunctionContext;
    let orchestrationContext: IMock<DurableOrchestrationContext>;
    let testSubject: OrchestrationSteps;
    let availabilityTestConfig: AvailabilityTestConfig;
    let loggerMock: IMock<OrchestrationLogger>;
    let activityActionDispatcherMock: IMock<ActivityActionDispatcher>;
    let scanWaitOrchestratorMock: IMock<ScanWaitOrchestrator>;
    const scanUrl = 'https://www.bing.com';
    const scanId = 'test-scan-id';
    const notifyScanUrl = 'scan-notify-url-stub';
    const webApiConfig: WebApiConfig = {
        releaseId: 'releaseId',
        baseUrl: 'base url',
    };

    beforeEach(() => {
        orchestrationContext = Mock.ofType<DurableOrchestrationContext>();
        orchestrationContext.setup((oc) => oc.instanceId).returns(() => orchestrationInstanceId);
        loggerMock = Mock.ofType<OrchestrationLogger>();
        activityActionDispatcherMock = Mock.ofType(ActivityActionDispatcher, MockBehavior.Strict);
        scanWaitOrchestratorMock = Mock.ofType<ScanWaitOrchestrator>();

        availabilityTestConfig = {
            scanWaitIntervalInSeconds: 10,
            maxScanWaitTimeInSeconds: 20,
            urlToScan: 'https://www.bing.com',
            logQueryTimeRange: 'P1D',
            environmentDefinition: 'canary',
            consolidatedIdBase: 'somereportid',
            maxScanCompletionNotificationWaitTimeInSeconds: 30,
            scanNotifyApiEndpoint: '/scan-notify-api',
            scanNotifyFailApiEndpoint: '/some-fail-endpoint',
            maxDeepScanWaitTimeInSeconds: 40,
        };

        context = <IOrchestrationFunctionContext>(<unknown>{
            df: orchestrationContext.object,
        });

        testSubject = new OrchestrationSteps(
            context,
            availabilityTestConfig,
            loggerMock.object,
            activityActionDispatcherMock.object,
            scanWaitOrchestratorMock.object,
            webApiConfig,
        );
    });

    afterEach(() => {
        orchestrationContext.verifyAll();
        activityActionDispatcherMock.verifyAll();
        scanWaitOrchestratorMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('getWebApiConfig', () => {
        expect(testSubject.getWebApiConfig()).toBe(webApiConfig);
    });

    describe('invokeHealthCheckActivity', () => {
        it('triggers getHealthStatus', () => {
            const healthCheckCallback = jest.fn();
            activityActionDispatcherMock
                .setup((a) => a.callWebRequestActivity(ActivityAction.getHealthStatus))
                .returns(() => generatorStub(healthCheckCallback))
                .verifiable();

            const generatorExecutor = new GeneratorExecutor(testSubject.invokeHealthCheckRestApi());
            generatorExecutor.runTillEnd();

            expect(healthCheckCallback).toHaveBeenCalled();
        });
    });

    describe('callSubmitScanRequestActivity', () => {
        let generatorExecutor: GeneratorExecutor<string>;
        let scanActivityData: CreateScanRequestData;

        beforeEach(() => {
            const scanRequestOptions: PostScanRequestOptions = {
                scanNotificationUrl: notifyScanUrl,
            };
            generatorExecutor = new GeneratorExecutor<string>(testSubject.invokeSubmitScanRequestRestApi(scanUrl, scanRequestOptions));
            scanActivityData = {
                scanUrl: scanUrl,
                scanOptions: {
                    priority: 1000,
                    scanNotificationUrl: notifyScanUrl,
                },
            };
        });

        it('triggers createScanRequest', () => {
            const response = {
                body: [{ scanId: scanId }],
            } as SerializableResponse<ScanRunResponse[]>;

            activityActionDispatcherMock
                .setup((a) => a.callWebRequestActivity(ActivityAction.createScanRequest, scanActivityData))
                .returns(() => generatorStub(() => null, response))
                .verifiable();

            const scanIdResult = generatorExecutor.runTillEnd();

            expect(scanIdResult).toEqual(scanId);
        });

        it('submitScanRequest throws error on scan submitted failure', () => {
            const error: WebApiError = {
                code: 'InternalError',
                codeId: 2000,
                message: 'test error message',
            };
            const response = {
                body: [{ error: error }],
            } as SerializableResponse<ScanRunResponse[]>;
            const trackAvailabilityCallback = jest.fn();

            activityActionDispatcherMock
                .setup((a) => a.callWebRequestActivity(ActivityAction.createScanRequest, scanActivityData))
                .returns(() => generatorStub(() => null, response))
                .verifiable();
            activityActionDispatcherMock
                .setup((a) =>
                    a.callTrackAvailability(false, {
                        requestResponse: JSON.stringify(response),
                        activityName: ActivityAction.createScanRequest,
                    }),
                )
                .returns(() => generatorStub(trackAvailabilityCallback))
                .verifiable();

            expect(() => generatorExecutor.runTillEnd()).toThrowError();
            expect(trackAvailabilityCallback).toHaveBeenCalled();
        });
    });

    describe('callGetScanReportActivity', () => {
        it('triggers getScanReport', () => {
            const reportId = 'test-report-id';
            const getScanReportData = {
                scanId: scanId,
                reportId: reportId,
            };
            const response = { body: 'report content' } as SerializableResponse;

            activityActionDispatcherMock
                .setup((a) => a.callWebRequestActivity(ActivityAction.getScanReport, getScanReportData))
                .returns(() => generatorStub(() => null, response))
                .verifiable();

            const generatorExecutor = new GeneratorExecutor<string>(testSubject.invokeGetScanReportRestApi(scanId, reportId));
            const reportResponse = generatorExecutor.runTillEnd();

            expect(reportResponse).toEqual(response);
        });
    });

    describe('runFunctionalTestGroups', () => {
        const testGroupNames: TestGroupName[] = ['PostScan', 'ScanStatus'];
        const testContextData: TestContextData = {
            scanUrl: 'scan url',
        };
        const scenarioName = 'testScenario';

        it('calls callActivitiesInParallel with expected testData', () => {
            const activities: ActivityRequestData[] = testGroupNames.map((testGroupName: TestGroupName) => {
                return {
                    activityName: ActivityAction.runFunctionalTestGroup,
                    data: {
                        runId: orchestrationInstanceId,
                        test: {
                            testGroupName,
                            scenarioName,
                        },
                        testContextData,
                        environment: 1,
                        releaseId: webApiConfig.releaseId,
                    } as RunFunctionalTestGroupData,
                };
            });
            const runActivitiesCallback = jest.fn();
            const taskName = `Run functional tests: ${testGroupNames}`;

            activityActionDispatcherMock
                .setup((a) => a.callActivitiesInParallel(activities, taskName))
                .returns(() => generatorStub(runActivitiesCallback))
                .verifiable();

            const generatorExecutor = new GeneratorExecutor(
                testSubject.runFunctionalTestGroups(scenarioName, testContextData, testGroupNames),
            );
            generatorExecutor.runTillEnd();

            expect(runActivitiesCallback).toHaveBeenCalled();
        });

        it('handles undefined list', () => {
            activityActionDispatcherMock
                .setup((a) => a.callActivitiesInParallel(It.isAny(), It.isAny()))
                .returns(() => generatorStub(() => null));

            const generatorExecutor = new GeneratorExecutor(testSubject.runFunctionalTestGroups(scenarioName, testContextData, undefined));
            generatorExecutor.runTillEnd();
        });
    });

    describe('Log test run start', () => {
        const testsToRun: TestIdentifier[] = [
            {
                testGroupName: 'PostScan',
                scenarioName: 'testScenario',
            },
        ];

        it('logTestRunStart', async () => {
            const expectedData: LogTestRunStartData = {
                runId: orchestrationInstanceId,
                environmentName: availabilityTestConfig.environmentDefinition,
                testsToRun: testsToRun,
                releaseId: webApiConfig.releaseId,
            };
            const logTestRunStartCallback = jest.fn();

            activityActionDispatcherMock
                .setup((a) => a.callActivity(ActivityAction.logTestRunStart, expectedData))
                .returns(() => generatorStub(logTestRunStartCallback))
                .verifiable();

            const generatorExecutor = new GeneratorExecutor(testSubject.logTestRunStart(testsToRun));
            generatorExecutor.runTillEnd();

            expect(logTestRunStartCallback).toHaveBeenCalled();
        });
    });

    describe('trackScanRequestCompleted', () => {
        it('tracks availability ', () => {
            const trackAvailabilityCallback = jest.fn();

            activityActionDispatcherMock
                .setup((a) => a.callTrackAvailability(true, { activityName: 'scanRequestCompleted' }))
                .returns(() => generatorStub(trackAvailabilityCallback))
                .verifiable();

            const generatorExecutor = new GeneratorExecutor(testSubject.trackScanRequestCompleted());
            generatorExecutor.runTillEnd();

            expect(trackAvailabilityCallback).toHaveBeenCalled();
        });
    });

    describe('WaitForBaseScanCompletion', () => {
        it('calls waitFor with expected args', async () => {
            const response = { scanId: scanId } as ScanRunResultResponse;
            const waitCallback = jest.fn();

            scanWaitOrchestratorMock
                .setup((s) =>
                    s.waitFor(
                        scanId,
                        'waitForBaseScanCompletion',
                        availabilityTestConfig.maxScanWaitTimeInSeconds,
                        availabilityTestConfig.scanWaitIntervalInSeconds,
                        ScanWaitConditions.baseScan,
                    ),
                )
                .returns(() => generatorStub(waitCallback, response))
                .verifiable();

            const generatorExecutor = new GeneratorExecutor<string>(testSubject.waitForBaseScanCompletion(scanId));
            const result = generatorExecutor.runTillEnd();

            expect(result).toEqual(response);

            expect(waitCallback).toHaveBeenCalled();
        });
    });

    describe('waitForScanCompletionNotification', () => {
        it('calls waitFor with expected args', async () => {
            const response = {
                scanId: scanId,
                notification: { scanNotifyUrl: notifyScanUrl },
            } as ScanRunResultResponse;
            const waitCallback = jest.fn();

            scanWaitOrchestratorMock
                .setup((s) =>
                    s.waitFor(
                        scanId,
                        'waitForScanCompletionNotification',
                        availabilityTestConfig.maxScanCompletionNotificationWaitTimeInSeconds,
                        availabilityTestConfig.scanWaitIntervalInSeconds,
                        ScanWaitConditions.scanNotification,
                    ),
                )
                .returns(() => generatorStub(waitCallback, response))
                .verifiable();

            const generatorExecutor = new GeneratorExecutor<string>(testSubject.waitForScanCompletionNotification(scanId));
            const result = generatorExecutor.runTillEnd();

            expect(result).toEqual(response.notification);

            expect(waitCallback).toHaveBeenCalled();
        });
    });

    describe('waitForDeepScanCompletion', () => {
        it('calls waitFor with expected arguments', () => {
            const response = {
                scanId: scanId,
            } as ScanRunResultResponse;
            const waitCallback = jest.fn();

            scanWaitOrchestratorMock
                .setup((s) =>
                    s.waitFor(
                        scanId,
                        'waitForDeepScanCompletion',
                        availabilityTestConfig.maxDeepScanWaitTimeInSeconds,
                        availabilityTestConfig.scanWaitIntervalInSeconds,
                        ScanWaitConditions.deepScan,
                    ),
                )
                .returns(() => generatorStub(waitCallback, response))
                .verifiable();

            const generatorExecutor = new GeneratorExecutor<string>(testSubject.waitForDeepScanCompletion(scanId));
            const result = generatorExecutor.runTillEnd();

            expect(result).toEqual(response);

            expect(waitCallback).toHaveBeenCalled();
        });
    });
});
