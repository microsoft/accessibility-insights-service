// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

/* eslint-disable import/no-internal-modules */
import { AvailabilityTestConfig, SerializableResponse } from 'common';
import { DurableOrchestrationContext, IOrchestrationFunctionContext, ITaskMethods, Task } from 'durable-functions/lib/src/classes';
import { TestContextData, TestGroupName } from 'functional-tests';
import { isNil } from 'lodash';
import moment from 'moment';
import { ScanRunErrorResponse, ScanRunResponse, ScanRunResultResponse, WebApiError } from 'service-library';
import { IMock, It, Mock, Times } from 'typemoq';
import { NotificationState } from 'storage-documents';
import { PostScanRequestOptions } from 'web-api-client';
import { ActivityAction } from './contracts/activity-actions';
import {
    ActivityRequestData,
    CreateScanRequestData,
    RunFunctionalTestGroupData,
    TrackAvailabilityData,
} from './controllers/activity-request-data';
import { OrchestrationStepsImpl, OrchestrationTelemetryProperties } from './orchestration-steps';
import { GeneratorExecutor } from './test-utilities/generator-executor';
import { MockableLogger } from './test-utilities/mockable-logger';

/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any */

class MockableDurableOrchestrationContext extends DurableOrchestrationContext {
    public readonly instanceId: string = null;
    public readonly isReplaying: boolean = null;
    public readonly currentUtcDateTime: Date = null;
    // eslint-disable-next-line @typescript-eslint/naming-convention,no-underscore-dangle,id-blacklist,id-match
    public readonly Task: ITaskMethods = null;
}

const orchestrationInstanceId = 'orchestration instance Id';

describe(OrchestrationStepsImpl, () => {
    let context: IOrchestrationFunctionContext;
    let orchestrationContext: IMock<DurableOrchestrationContext>;
    let testSubject: OrchestrationStepsImpl;
    let availabilityTestConfig: AvailabilityTestConfig;
    let loggerMock: IMock<MockableLogger>;
    const scanUrl = 'https://www.bing.com';
    const scanId = 'test-scan-id';
    let currentUtcDateTime: Date;
    const notifyScanUrl = 'scan-notify-url-stub';

    beforeEach(() => {
        currentUtcDateTime = new Date(2019, 2, 1);
        orchestrationContext = Mock.ofType(MockableDurableOrchestrationContext);
        orchestrationContext.setup((oc) => oc.instanceId).returns(() => orchestrationInstanceId);
        orchestrationContext.setup((oc) => oc.isReplaying).returns(() => true);
        orchestrationContext.setup((oc) => oc.currentUtcDateTime).returns(() => currentUtcDateTime);

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
        };

        loggerMock = Mock.ofType(MockableLogger);

        context = <IOrchestrationFunctionContext>(<unknown>{
            bindingDefinitions: {},
            executionContext: {
                functionName: 'function-name',
                invocationId: 'id',
            },
            bindingData: {
                logger: undefined,
            },
            df: orchestrationContext.object,
        });

        testSubject = new OrchestrationStepsImpl(context, availabilityTestConfig, loggerMock.object);
    });

    afterEach(() => {
        orchestrationContext.verifyAll();
    });

    describe('callHealthCheckActivity', () => {
        let generatorExecutor: GeneratorExecutor;
        let activityRequestData: ActivityRequestData;

        beforeEach(() => {
            generatorExecutor = new GeneratorExecutor(testSubject.invokeHealthCheckRestApi());
            activityRequestData = {
                activityName: ActivityAction.getHealthStatus,
                data: undefined,
            };
        });

        test.each([200, 299])('triggers healthCheckActivity with status code %o', async (statusCode) => {
            const response: SerializableResponse = createSerializableResponse(statusCode);

            orchestrationContext
                .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                .returns(() => response as any)
                .verifiable(Times.once());
            setupTrackActivityNeverCalled();

            generatorExecutor.runTillEnd();
        });

        test.each([199, 300])('healthCheckActivity throws error on status code %o', async (statusCode) => {
            const response: SerializableResponse = createSerializableResponse(statusCode);

            orchestrationContext
                .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                .returns(() => response as any)
                .verifiable(Times.once());

            setupVerifyTrackActivityCall(false, {
                requestResponse: JSON.stringify(response),
                activityName: ActivityAction.getHealthStatus,
            });

            expect(() => generatorExecutor.runTillEnd()).toThrowError();
        });
    });

    describe('callSubmitScanRequestActivity', () => {
        let generatorExecutor: GeneratorExecutor<string>;
        let activityRequestData: ActivityRequestData;

        beforeEach(() => {
            const scanRequestOptions: PostScanRequestOptions = {
                scanNotificationUrl: notifyScanUrl,
            };
            generatorExecutor = new GeneratorExecutor<string>(testSubject.invokeSubmitScanRequestRestApi(scanUrl, scanRequestOptions));
            activityRequestData = {
                activityName: ActivityAction.createScanRequest,
                data: {
                    scanUrl: scanUrl,
                    scanOptions: {
                        priority: 1000,
                        scanNotificationUrl: notifyScanUrl,
                    },
                } as CreateScanRequestData,
            };
        });

        test.each([200, 299])('triggers submitScanRequest with status code %o', async (statusCode) => {
            const response: SerializableResponse<ScanRunResponse[]> = createSerializableResponse<ScanRunResponse[]>(statusCode, [
                { scanId: scanId } as ScanRunResponse,
            ]);

            orchestrationContext
                .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                .returns((name, data) => {
                    return response as any;
                })
                .verifiable(Times.once());
            setupTrackActivityNeverCalled();

            const scanIdResult = generatorExecutor.runTillEnd();
            expect(scanIdResult).toEqual(scanId);
        });

        test.each([199, 300])('submitScanRequest throws error on status code %o', async (statusCode) => {
            const response: SerializableResponse<ScanRunResponse[]> = createSerializableResponse<ScanRunResponse[]>(statusCode);

            orchestrationContext
                .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                .returns(() => response as any)
                .verifiable(Times.once());

            setupVerifyTrackActivityCall(false, {
                requestResponse: JSON.stringify(response),
                activityName: ActivityAction.createScanRequest,
            });

            expect(() => generatorExecutor.runTillEnd()).toThrowError();
        });

        it('submitScanRequest throws error on scan submitted failure', async () => {
            const error: WebApiError = {
                code: 'InternalError',
                codeId: 2000,
                message: 'test error message',
            };

            const response: SerializableResponse<ScanRunResponse[]> = createSerializableResponse<ScanRunResponse[]>(200, [
                { error: error } as ScanRunResponse,
            ]);

            orchestrationContext
                .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                .returns(() => response as any)
                .verifiable(Times.once());

            setupVerifyTrackActivityCall(false, {
                requestResponse: JSON.stringify(response),
                activityName: ActivityAction.createScanRequest,
            });

            expect(() => generatorExecutor.runTillEnd()).toThrowError();
        });
    });

    describe('callGetScanReportActivity', () => {
        let generatorExecutor: GeneratorExecutor;
        let activityRequestData: ActivityRequestData;
        const reportId = 'test-report-id';

        beforeEach(() => {
            generatorExecutor = new GeneratorExecutor<string>(testSubject.invokeGetScanReportRestApi(scanId, reportId));
            activityRequestData = {
                activityName: ActivityAction.getScanReport,
                data: {
                    scanId: scanId,
                    reportId: reportId,
                },
            };
        });

        test.each([200, 299])('triggers getScanReport with status code %o', async (statusCode) => {
            const response: SerializableResponse = createSerializableResponse(statusCode);

            orchestrationContext
                .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                .returns(() => {
                    return response as any;
                })
                .verifiable(Times.once());
            setupVerifyTrackActivityCall(true, { activityName: ActivityAction.getScanReport });

            generatorExecutor.runTillEnd();
        });

        test.each([199, 300])('getScanReport throws error on status code %o', async (statusCode) => {
            const response: SerializableResponse = createSerializableResponse(statusCode);

            orchestrationContext
                .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                .returns(() => response as any)
                .verifiable(Times.once());

            setupVerifyTrackActivityCall(false, {
                requestResponse: JSON.stringify(response),
                activityName: ActivityAction.getScanReport,
            });

            expect(() => generatorExecutor.runTillEnd()).toThrowError();
        });
    });

    describe('verifyScanSubmitted', () => {
        let generatorExecutor: GeneratorExecutor;
        let activityRequestData: ActivityRequestData;

        beforeEach(() => {
            generatorExecutor = new GeneratorExecutor<string>(testSubject.validateScanRequestSubmissionState(scanId));
            activityRequestData = {
                activityName: ActivityAction.getScanResult,
                data: {
                    scanId: scanId,
                },
            };
        });

        test.each([200, 299])('triggers verifyScanSubmitted with status code %o', async (statusCode) => {
            const scanResultResponse: ScanRunResultResponse = {
                url: scanUrl,
                scanId: scanId,
                run: {
                    state: 'pending',
                },
            };
            const response: SerializableResponse<ScanRunResponse> = createSerializableResponse<ScanRunResultResponse>(
                statusCode,
                scanResultResponse,
            );

            orchestrationContext
                .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                .returns(() => {
                    return response as any;
                })
                .verifiable(Times.once());
            setupTrackActivityNeverCalled();

            generatorExecutor.runTillEnd();
        });

        test.each([199, 300])('verifyScanSubmitted throws error on status code %o', async (statusCode) => {
            const response: SerializableResponse<ScanRunResponse> = createSerializableResponse<ScanRunResultResponse>(statusCode);
            orchestrationContext
                .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                .returns(() => response as any)
                .verifiable(Times.once());

            setupVerifyTrackActivityCall(false, {
                requestResponse: JSON.stringify(response),
                activityName: ActivityAction.getScanResult,
            });

            expect(() => generatorExecutor.runTillEnd()).toThrowError();
        });

        it('submitScanRequest throws error on scan submitted failure', async () => {
            const error: WebApiError = {
                code: 'InternalError',
                codeId: 2000,
                message: 'test error message',
            };

            const response: SerializableResponse<ScanRunErrorResponse> = createSerializableResponse<ScanRunErrorResponse>(200, {
                scanId: scanId,
                error: error,
            } as ScanRunErrorResponse);

            orchestrationContext
                .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                .returns(() => response as any)
                .verifiable(Times.once());

            setupVerifyTrackActivityCall(false, {
                requestResponse: JSON.stringify(response),
                activityName: ActivityAction.getScanResult,
            });

            expect(() => generatorExecutor.runTillEnd()).toThrowError();
        });
    });

    describe('waitForScanRequestCompletion', () => {
        let generatorExecutor: GeneratorExecutor;
        let activityRequestData: ActivityRequestData;
        let nextTime1: moment.Moment;
        let nextTime2: moment.Moment;
        let nextTime3: moment.Moment;

        beforeEach(() => {
            generatorExecutor = new GeneratorExecutor<string>(testSubject.waitForScanRequestCompletion(scanId));

            availabilityTestConfig.scanWaitIntervalInSeconds = 10;
            availabilityTestConfig.maxScanWaitTimeInSeconds = 10 * 2 + 1;
            nextTime1 = moment.utc(currentUtcDateTime).add(availabilityTestConfig.scanWaitIntervalInSeconds, 'seconds');
            nextTime2 = nextTime1.clone().add(availabilityTestConfig.scanWaitIntervalInSeconds, 'seconds');
            nextTime3 = nextTime2.clone().add(availabilityTestConfig.scanWaitIntervalInSeconds, 'seconds');

            activityRequestData = {
                activityName: ActivityAction.getScanResult,
                data: {
                    scanId: scanId,
                },
            };
        });

        it('times out if not completed by max time', async () => {
            setupCreateTimer(nextTime1);
            setupCreateTimer(nextTime2);
            setupCreateTimer(nextTime3);

            const response: SerializableResponse<ScanRunResultResponse> = createSerializableResponse<ScanRunResultResponse>(200, {
                scanId: scanId,
                run: {
                    state: 'queued',
                },
            } as ScanRunResultResponse);

            orchestrationContext
                .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                .returns(() => response as any)
                .verifiable(Times.atLeast(2));

            setupVerifyTrackActivityCall(false, {
                activityName: 'waitForScanCompletion',
                requestResponse: JSON.stringify(response),
                currentUtcDateTime: nextTime3.toDate().toUTCString(),
            });

            expect(() => generatorExecutor.runTillEnd()).toThrowError();
        });

        it('completes if the scan completed before max time', async () => {
            const response: SerializableResponse<ScanRunResultResponse> = createSerializableResponse<ScanRunResultResponse>(200, {
                scanId: scanId,
                run: {
                    state: 'queued',
                },
            } as ScanRunResultResponse);

            setupCreateTimer(nextTime1);
            setupCreateTimer(nextTime2, () => {
                response.body.run.state = 'completed';
            });
            setupCreateTimerNeverCalled(nextTime3);

            orchestrationContext
                .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                .returns(() => response as any)
                .verifiable(Times.atLeast(2));

            setupTrackActivityNeverCalled();

            generatorExecutor.runTillEnd();
        });

        it('throws if the scan failed before max time', async () => {
            let response: SerializableResponse<ScanRunResultResponse> = createSerializableResponse<ScanRunResultResponse>(200, {
                scanId: scanId,
                run: {
                    state: 'queued',
                },
            } as ScanRunResultResponse);
            const failedResponse: SerializableResponse<ScanRunResultResponse> = createSerializableResponse<ScanRunResultResponse>(200, {
                scanId: scanId,
                run: {
                    state: 'failed',
                },
            } as ScanRunResultResponse);

            setupCreateTimer(nextTime1);
            setupCreateTimer(nextTime2, () => {
                response = failedResponse;
            });
            setupCreateTimerNeverCalled(nextTime3);

            orchestrationContext
                .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                .returns(() => response as any)
                .verifiable(Times.atLeast(2));

            setupVerifyTrackActivityCall(false, {
                activityName: 'waitForScanCompletion',
                requestResponse: JSON.stringify(failedResponse),
                currentUtcDateTime: nextTime2.toDate().toUTCString(),
            });

            expect(() => generatorExecutor.runTillEnd()).toThrowError();
        });

        test.each([199, 400])('throws if the scan api returns with failure status code %o', async (statusCode: number) => {
            const response: SerializableResponse = createSerializableResponse(statusCode);

            setupCreateTimer(nextTime1);
            setupCreateTimerNeverCalled(nextTime2);

            orchestrationContext
                .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                .returns(() => response as any)
                .verifiable(Times.atLeast(1));

            setupVerifyTrackActivityCall(false, {
                activityName: 'getScanResult',
                requestResponse: JSON.stringify(response),
                currentUtcDateTime: nextTime1.toDate().toUTCString(),
            });

            expect(() => generatorExecutor.runTillEnd()).toThrowError();
        });
    });

    describe('run functional test groups', () => {
        const testContextData: TestContextData = {
            scanUrl: 'scan url',
        };
        let taskMethodsMock: IMock<ITaskMethods>;

        beforeEach(() => {
            taskMethodsMock = Mock.ofType<ITaskMethods>();
            orchestrationContext.setup((oc) => oc.Task).returns(() => taskMethodsMock.object);
        });

        it('does nothing if list is undefined', () => {
            orchestrationContext.setup((oc) => oc.callActivity(It.isAny(), It.isAny())).verifiable(Times.never());
            taskMethodsMock.setup((t) => t.all(It.isAny())).verifiable(Times.never());

            executeRunFunctionalGroups(undefined);

            taskMethodsMock.verifyAll();
        });

        it('does nothing if list is empty', () => {
            orchestrationContext.setup((oc) => oc.callActivity(It.isAny(), It.isAny())).verifiable(Times.never());
            taskMethodsMock.setup((t) => t.all(It.isAny())).verifiable(Times.never());

            executeRunFunctionalGroups([]);

            taskMethodsMock.verifyAll();
        });

        it('triggers all test groups', () => {
            const testGroupNames: TestGroupName[] = ['PostScan', 'ScanStatus'];
            const task = {
                isCompleted: true,
                isFaulted: false,
                action: undefined,
            } as Task;

            const activityRequestData: ActivityRequestData[] = testGroupNames.map((testGroupName: TestGroupName) => {
                return {
                    activityName: ActivityAction.runFunctionalTestGroup,
                    data: {
                        runId: orchestrationInstanceId,
                        testGroupName,
                        testContextData,
                        environment: 1,
                    } as RunFunctionalTestGroupData,
                };
            });
            activityRequestData.forEach((data: ActivityRequestData) => {
                orchestrationContext
                    .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, data))
                    .returns(() => task)
                    .verifiable(Times.once());
            });

            let taskList: Task[];
            taskMethodsMock
                .setup((t) => t.all(It.isAny()))
                .callback((tasks: Task[]) => (taskList = tasks))
                .verifiable(Times.once());

            executeRunFunctionalGroups(testGroupNames);

            expect(taskList.length === 2);
            expect(taskList[0]).toEqual(task);
            expect(taskList[1]).toEqual(task);

            taskMethodsMock.verifyAll();
        });

        function executeRunFunctionalGroups(testGroupNames: TestGroupName[]): void {
            const generatorExecutor = new GeneratorExecutor<string>(testSubject.runFunctionalTestGroups(testContextData, testGroupNames));
            generatorExecutor.runTillEnd();
        }
    });

    describe('Log test run start', () => {
        const testGroupNames = ['testGroup1', 'testGroup2'];
        const testGroupNamesStr = 'testGroup1,testGroup2';
        const releaseId = 'release id';
        let expectedLogProperties: { [name: string]: string };

        beforeEach(() => {
            expectedLogProperties = {
                ...getDefaultTelemetryProperties(),
                source: 'BeginTestSuite',
                functionalTestGroups: testGroupNamesStr,
                runId: orchestrationInstanceId,
                releaseId: releaseId,
                environment: availabilityTestConfig.environmentDefinition,
            };
            process.env.RELEASE_VERSION = releaseId;
        });

        it('logTestRunStart', async () => {
            loggerMock.setup((l) => l.trackEvent('FunctionalTest', expectedLogProperties));

            testSubject.logTestRunStart(testGroupNames);

            loggerMock.verifyAll();
        });
    });

    describe('waitForScanCompletionNotification', () => {
        let generatorExecutor: GeneratorExecutor;
        let activityRequestData: ActivityRequestData;
        let nextTime1: moment.Moment;
        let nextTime2: moment.Moment;
        let nextTime3: moment.Moment;
        let response: SerializableResponse<ScanRunResultResponse>;

        beforeEach(() => {
            generatorExecutor = new GeneratorExecutor<string>(testSubject.waitForScanCompletionNotification(scanId));

            availabilityTestConfig.scanWaitIntervalInSeconds = 10;
            availabilityTestConfig.maxScanCompletionNotificationWaitTimeInSeconds = 10 * 2 + 1;
            nextTime1 = moment.utc(currentUtcDateTime).add(availabilityTestConfig.scanWaitIntervalInSeconds, 'seconds');
            nextTime2 = nextTime1.clone().add(availabilityTestConfig.scanWaitIntervalInSeconds, 'seconds');
            nextTime3 = nextTime2.clone().add(availabilityTestConfig.scanWaitIntervalInSeconds, 'seconds');

            activityRequestData = {
                activityName: ActivityAction.getScanResult,
                data: {
                    scanId: scanId,
                },
            };

            response = createSerializableResponse<ScanRunResultResponse>(200, {
                scanId: scanId,
                notification: {
                    state: 'pending',
                },
            } as ScanRunResultResponse);
        });

        it.each(['pending', 'sending', 'queued'])(
            'times out if not completed with state %s by max time',
            async (incompleteState: NotificationState) => {
                response.body.notification.state = incompleteState;
                setupCreateTimer(nextTime1);
                setupCreateTimer(nextTime2);
                setupCreateTimer(nextTime3);

                orchestrationContext
                    .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                    .returns(() => response as any)
                    .verifiable(Times.atLeast(2));

                setupVerifyTrackActivityCall(false, {
                    activityName: 'waitForScanCompletionNotification',
                    requestResponse: JSON.stringify(response),
                    currentUtcDateTime: nextTime3.toDate().toUTCString(),
                });

                expect(() => generatorExecutor.runTillEnd()).toThrowError();
            },
        );

        it.each(['sent', 'sendFailed', 'queueFailed'])(
            'completes if the scan completed with state %s before max time',
            async (completedState: NotificationState) => {
                setupCreateTimer(nextTime1);
                setupCreateTimer(nextTime2, () => {
                    response.body.notification.state = completedState;
                });
                setupCreateTimerNeverCalled(nextTime3);

                orchestrationContext
                    .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                    .returns(() => response as any)
                    .verifiable(Times.atLeast(2));

                setupTrackActivityNeverCalled();

                generatorExecutor.runTillEnd();
            },
        );

        test.each([199, 400])('throws if the scan api returns with failure status code %o', async (statusCode: number) => {
            response = createSerializableResponse(statusCode);

            setupCreateTimer(nextTime1);
            setupCreateTimerNeverCalled(nextTime2);

            orchestrationContext
                .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData))
                .returns(() => response as any)
                .verifiable(Times.atLeast(1));

            setupVerifyTrackActivityCall(false, {
                activityName: 'getScanResult',
                requestResponse: JSON.stringify(response),
                currentUtcDateTime: nextTime1.toDate().toUTCString(),
            });

            expect(() => generatorExecutor.runTillEnd()).toThrowError();
        });
    });

    function setupCreateTimer(fireTime: moment.Moment, callback?: () => void): void {
        orchestrationContext
            .setup((oc) => oc.createTimer(fireTime.toDate()))
            .returns(() => {
                currentUtcDateTime = fireTime.toDate();
                if (!isNil(callback)) {
                    callback();
                }

                return undefined;
            })
            .verifiable(Times.once());
    }

    function setupCreateTimerNeverCalled(fireTime: moment.Moment): void {
        orchestrationContext.setup((oc) => oc.createTimer(fireTime.toDate())).verifiable(Times.never());
    }

    function createSerializableResponse<T>(statusCode: number, data?: T): SerializableResponse<T> {
        return ({
            statusCode: statusCode,
            body: data,
        } as any) as SerializableResponse<T>;
    }

    function setupTrackActivityNeverCalled(): void {
        orchestrationContext
            .setup((oc) =>
                oc.callActivity(
                    OrchestrationStepsImpl.activityTriggerFuncName,
                    It.is((val: ActivityRequestData) => val.activityName === ActivityAction.trackAvailability),
                ),
            )
            .verifiable(Times.never());
    }

    function getDefaultTelemetryProperties(): OrchestrationTelemetryProperties {
        return {
            instanceId: context.df.instanceId,
            isReplaying: context.df.isReplaying.toString(),
            currentUtcDateTime: context.df.currentUtcDateTime.toUTCString(),
        };
    }

    function setupVerifyTrackActivityCall(success: boolean, properties?: OrchestrationTelemetryProperties): void {
        const trackAvailabilityRequestData = getTrackAvailabilityRequestData(success, properties);

        orchestrationContext
            .setup((oc) => oc.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, trackAvailabilityRequestData))
            .returns(() => undefined)
            .verifiable(Times.once());
    }

    function getTrackAvailabilityRequestData(success: boolean, properties?: OrchestrationTelemetryProperties): ActivityRequestData {
        return {
            activityName: ActivityAction.trackAvailability,
            data: {
                name: 'workerAvailabilityTest',
                telemetry: {
                    success: success,
                    properties: {
                        ...getDefaultTelemetryProperties(),
                        ...properties,
                    },
                },
            } as TrackAvailabilityData,
        };
    }
});
