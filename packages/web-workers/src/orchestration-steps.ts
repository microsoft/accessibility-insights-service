// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
/* eslint-disable import/no-internal-modules,  */
import { AvailabilityTestConfig, SerializableResponse } from 'common';
import { IOrchestrationFunctionContext, Task, TaskSet } from 'durable-functions/lib/src/classes';
import { TestContextData, TestEnvironment, TestGroupName } from 'functional-tests';
import { isNil, isEmpty } from 'lodash';
import { Logger, LogLevel } from 'logger';
import moment from 'moment';
import { ScanCompletedNotification, ScanRunErrorResponse, ScanRunResponse, ScanRunResultResponse } from 'service-library';
import { PostScanRequestOptions } from 'web-api-client';
import { ActivityAction } from './contracts/activity-actions';
import {
    ActivityRequestData,
    CreateScanRequestData,
    GetScanReportData,
    GetScanResultData,
    LogTestRunStartData,
    RunFunctionalTestGroupData,
    TestIdentifier,
    TrackAvailabilityData,
} from './controllers/activity-request-data';

export interface OrchestrationTelemetryProperties {
    requestResponse?: string;
    instanceId?: string;
    isReplaying?: string;
    currentUtcDateTime?: string;
    totalWaitTimeInSeconds?: string;
    activityName?: string;
    failureMessage?: string;
    waitEndTime?: string;
    waitStartTime?: string;
}

export interface OrchestrationSteps {
    invokeHealthCheckRestApi(): Generator<Task, void, SerializableResponse>;
    invokeSubmitScanRequestRestApi(scanUrl: string, scanOptions: PostScanRequestOptions): Generator<Task, string, SerializableResponse>;
    validateScanRequestSubmissionState(scanId: string): Generator<Task, void, SerializableResponse & void>;
    waitForBaseScanCompletion(scanId: string): Generator<Task, ScanRunResultResponse, SerializableResponse & void>;
    waitForScanCompletionNotification(scanId: string): Generator<Task, ScanCompletedNotification, SerializableResponse & void>;
    waitForDeepScanCompletion(scanId: string): Generator<Task, ScanRunResultResponse, SerializableResponse & void>;
    invokeGetScanReportRestApi(scanId: string, reportId: string): Generator<Task, void, SerializableResponse & void>;
    runFunctionalTestGroups(
        testScenarioName: string,
        testContextData: TestContextData,
        testGroupNames: TestGroupName[],
    ): Generator<TaskSet, void, SerializableResponse & void>;
    logTestRunStart(testsToRun: TestIdentifier[]): Generator<Task, void, SerializableResponse & void>;
    trackScanRequestCompleted(): Generator<Task, void, SerializableResponse & void>;
}

export class OrchestrationStepsImpl implements OrchestrationSteps {
    public static readonly activityTriggerFuncName = 'health-monitor-client-func';

    constructor(
        private readonly context: IOrchestrationFunctionContext,
        private readonly availabilityTestConfig: AvailabilityTestConfig,
        private readonly logger: Logger,
    ) {}

    public *invokeHealthCheckRestApi(): Generator<Task, void, SerializableResponse & void> {
        yield* this.callWebRequestActivity(ActivityAction.getHealthStatus);
    }

    public *invokeGetScanReportRestApi(scanId: string, reportId: string): Generator<Task, void, SerializableResponse & void> {
        const activityName = ActivityAction.getScanReport;
        const requestData: GetScanReportData = {
            scanId: scanId,
            reportId: reportId,
        };

        yield* this.callWebRequestActivity(activityName, requestData);

        this.logOrchestrationStep('Successfully fetched scan report');
    }

    public *waitForBaseScanCompletion(scanId: string): Generator<Task, ScanRunResultResponse, SerializableResponse & void> {
        const scanRunSucceeded = (scanRunResult: ScanRunResultResponse) =>
            scanRunResult.scanResult?.state === 'pass' || scanRunResult.scanResult?.state === 'fail';
        const scanRunCompleted = (scanRunResult: ScanRunResultResponse) =>
            scanRunResult.run.state === 'failed' || scanRunSucceeded(scanRunResult);

        return yield* this.waitFor(
            scanId,
            'waitForBaseScanCompletion',
            this.availabilityTestConfig.maxScanWaitTimeInSeconds,
            this.availabilityTestConfig.scanWaitIntervalInSeconds,
            scanRunCompleted,
            scanRunSucceeded,
        );
    }

    public *waitForScanCompletionNotification(scanId: string): Generator<Task, ScanCompletedNotification, SerializableResponse & void> {
        const scanNotificationCompleted = (scanRunResponse: ScanRunResultResponse) =>
            ['sendFailed', 'queueFailed', 'sent'].includes(scanRunResponse.notification.state);

        const scanStatus = yield* this.waitFor(
            scanId,
            'waitForScanCompletionNotification',
            this.availabilityTestConfig.maxScanCompletionNotificationWaitTimeInSeconds,
            this.availabilityTestConfig.scanWaitIntervalInSeconds,
            scanNotificationCompleted,
        );

        return scanStatus?.notification;
    }

    public *waitForDeepScanCompletion(scanId: string): Generator<Task, ScanRunResultResponse, SerializableResponse & void> {
        const deepScanSucceeded = (scanRunResult: ScanRunResultResponse) => scanRunResult.run.state === 'completed';
        const deepScanCompleted = (scanRunResult: ScanRunResultResponse) =>
            scanRunResult.run.state === 'failed' || deepScanSucceeded(scanRunResult);

        return yield* this.waitFor(
            scanId,
            'waitForDeepScanCompletion',
            this.availabilityTestConfig.maxDeepScanWaitTimeInSeconds,
            this.availabilityTestConfig.scanWaitIntervalInSeconds,
            deepScanCompleted,
            deepScanSucceeded,
        );
    }

    private *waitFor(
        scanId: string,
        activityName: string,
        maxWaitTime: number,
        waitTimeInterval: number,
        isCompleted: (requestResponse: ScanRunResultResponse) => boolean,
        isSucceeded: (requestResponse: ScanRunResultResponse) => boolean = isCompleted,
    ): Generator<Task, ScanRunResultResponse, SerializableResponse & void> {
        const waitStartTime = moment.utc(this.context.df.currentUtcDateTime);
        const waitEndTime = waitStartTime.clone().add(maxWaitTime, 'seconds');
        let scanStatusResponse: SerializableResponse;
        let scanStatus: ScanRunResultResponse;
        let completed: boolean = false;

        this.logOrchestrationStep(`Starting ${activityName}`);

        while (completed === false && moment.utc(this.context.df.currentUtcDateTime).isBefore(waitEndTime)) {
            this.logOrchestrationStep(`Starting timer with wait time ${waitTimeInterval}`, LogLevel.info, {
                waitStartTime: waitStartTime.toJSON(),
                waitEndTime: waitEndTime.toJSON(),
            });

            const timerOutput = yield this.context.df.createTimer(
                moment.utc(this.context.df.currentUtcDateTime).add(waitTimeInterval, 'seconds').toDate(),
            );

            this.logOrchestrationStep('Timer completed', LogLevel.info, {
                requestResponse: JSON.stringify(timerOutput),
                waitStartTime: waitStartTime.toJSON(),
                waitEndTime: waitEndTime.toJSON(),
            });

            scanStatusResponse = yield* this.callGetScanStatusActivity(scanId);
            scanStatus = yield* this.getScanStatus(scanStatusResponse);

            completed = isCompleted(scanStatus);
        }

        const totalWaitTimeInSeconds = moment.utc(this.context.df.currentUtcDateTime).diff(moment.utc(waitStartTime), 'seconds');

        if (completed === true && isSucceeded(scanStatus)) {
            this.logOrchestrationStep(`${activityName} succeeded`, LogLevel.info, {
                totalWaitTimeInSeconds: totalWaitTimeInSeconds.toString(),
                waitStartTime: waitStartTime.toJSON(),
                waitEndTime: waitEndTime.toJSON(),
            });
        } else {
            const scanStatusResponseString = JSON.stringify(scanStatusResponse);

            yield* this.trackAvailability(false, {
                activityName: activityName,
                requestResponse: scanStatusResponseString,
            });

            const traceData = {
                requestResponse: scanStatusResponseString,
                totalWaitTimeInSeconds: totalWaitTimeInSeconds.toString(),
                waitStartTime: waitStartTime.toJSON(),
                waitEndTime: waitEndTime.toJSON(),
            };
            this.logOrchestrationStep(`${activityName} failed`, LogLevel.error, traceData);

            throw new Error(`${activityName} failed. ${JSON.stringify(traceData)}`);
        }

        return scanStatus;
    }

    public *validateScanRequestSubmissionState(scanId: string): Generator<Task, void, SerializableResponse & void> {
        const response = yield* this.callGetScanStatusActivity(scanId);
        yield* this.getScanStatus(response);
        this.logOrchestrationStep('Verified scan submitted successfully', LogLevel.info, { requestResponse: JSON.stringify(response) });
    }

    public *invokeSubmitScanRequestRestApi(
        scanUrl: string,
        scanOptions?: PostScanRequestOptions,
    ): Generator<Task, string, SerializableResponse & void> {
        const requestData: CreateScanRequestData = {
            scanUrl,
            scanOptions: {
                priority: 1000,
                ...scanOptions,
            },
        };

        const response = yield* this.callWebRequestActivity(ActivityAction.createScanRequest, requestData);
        const scanId = yield* this.getScanIdFromResponse(response, ActivityAction.createScanRequest);
        this.logOrchestrationStep(`Orchestrator submitted scan with scan Id: ${scanId} and options ${JSON.stringify(scanOptions)}`);

        return scanId;
    }

    public *runFunctionalTestGroups(
        testScenarioName: string,
        testContextData: TestContextData,
        testGroupNames: TestGroupName[],
    ): Generator<TaskSet, void, void> {
        if (isEmpty(testGroupNames)) {
            this.logOrchestrationStep('List of functional tests is empty. Skipping this test run.');

            return;
        }

        const parallelTasks = testGroupNames.map((testGroupName: TestGroupName) => {
            const testData: RunFunctionalTestGroupData = {
                runId: this.context.df.instanceId,
                test: {
                    testGroupName,
                    scenarioName: testScenarioName,
                },
                testContextData,
                environment: this.getTestEnvironment(this.availabilityTestConfig.environmentDefinition),
            };

            const activityRequestData: ActivityRequestData = {
                activityName: ActivityAction.runFunctionalTestGroup,
                data: testData,
            };

            return this.context.df.callActivity(OrchestrationStepsImpl.activityTriggerFuncName, activityRequestData);
        });

        this.logOrchestrationStep(`Starting functional tests: ${testGroupNames}`);

        yield this.context.df.Task.all(parallelTasks);

        this.logOrchestrationStep(`Completed functional tests: ${testGroupNames}`);
    }

    public *logTestRunStart(testsToRun: TestIdentifier[]): Generator<Task, void, SerializableResponse & void> {
        const activityData: LogTestRunStartData = {
            runId: this.context.df.instanceId,
            environmentName: this.availabilityTestConfig.environmentDefinition,
            testsToRun: testsToRun,
        };
        yield* this.callActivity(ActivityAction.logTestRunStart, false, activityData);
    }

    public *trackScanRequestCompleted(): Generator<Task, void, SerializableResponse & void> {
        yield* this.trackAvailability(true, {
            activityName: 'scanRequestCompleted',
        });
    }

    private getTestEnvironment(environment: string): TestEnvironment {
        for (const [key, value] of Object.entries(TestEnvironment)) {
            if (key === environment) {
                return value as TestEnvironment;
            }
        }

        return TestEnvironment.none;
    }

    private *callGetScanStatusActivity(scanId: string): Generator<Task, SerializableResponse, SerializableResponse & void> {
        const requestData: GetScanResultData = { scanId: scanId };

        return yield* this.callWebRequestActivity(ActivityAction.getScanResult, requestData);
    }

    private *trackAvailability(
        success: boolean,
        properties: OrchestrationTelemetryProperties,
    ): Generator<Task, void, SerializableResponse & void> {
        const data: TrackAvailabilityData = {
            name: 'workerAvailabilityTest',
            telemetry: {
                properties: {
                    ...this.getDefaultLogProperties(),
                    ...properties,
                },
                success: success,
            },
        };

        yield* this.callActivity(ActivityAction.trackAvailability, false, data);
    }

    private *ensureSuccessStatusCode(
        response: SerializableResponse,
        activityName: string,
    ): Generator<Task, void, SerializableResponse & void> {
        if (response.statusCode < 200 || response.statusCode >= 300) {
            this.logOrchestrationStep(`${activityName} activity failed`, LogLevel.error, {
                requestResponse: JSON.stringify(response),
                activityName,
            });

            yield* this.trackAvailability(false, {
                requestResponse: JSON.stringify(response),
                activityName: activityName,
            });

            throw new Error(`Request failed ${JSON.stringify(response)}`);
        } else {
            this.logOrchestrationStep(`${activityName} activity completed`, LogLevel.info, {
                activityName,
                requestResponse: JSON.stringify(response),
            });
        }
    }

    private getDefaultLogProperties(): OrchestrationTelemetryProperties {
        return {
            instanceId: this.context.df.instanceId,
            isReplaying: this.context.df.isReplaying.toString(),
            currentUtcDateTime: this.context.df.currentUtcDateTime.toUTCString(),
        };
    }

    private logOrchestrationStep(message: string, logType: LogLevel = LogLevel.info, properties?: OrchestrationTelemetryProperties): void {
        this.logger.log(message, logType, {
            ...this.getDefaultLogProperties(),
            ...properties,
        });
    }

    private *callWebRequestActivity(
        activityName: ActivityAction,
        data?: unknown,
    ): Generator<Task, SerializableResponse, SerializableResponse & void> {
        return yield* this.callActivity(activityName, true, data);
    }

    private *callActivity(
        activityName: ActivityAction,
        isWebResponse: boolean,
        data?: unknown,
    ): Generator<Task, SerializableResponse, SerializableResponse & void> {
        const activityRequestData: ActivityRequestData = {
            activityName: activityName,
            data: data,
        };

        this.logOrchestrationStep(`Executing '${activityName}' orchestration step.`);
        const response = (yield this.context.df.callActivity(
            OrchestrationStepsImpl.activityTriggerFuncName,
            activityRequestData,
        )) as SerializableResponse;

        if (isWebResponse) {
            yield* this.ensureSuccessStatusCode(response, activityName);
        } else {
            this.logOrchestrationStep(`${activityName} activity completed`);
        }

        return response;
    }

    private *getScanStatus(response: SerializableResponse): Generator<Task, ScanRunResultResponse, SerializableResponse & void> {
        const scanErrorResultResponse = response.body as ScanRunErrorResponse;
        if (isNil(scanErrorResultResponse.error)) {
            return response.body as ScanRunResultResponse;
        } else {
            this.logOrchestrationStep('Scan request failed', LogLevel.error, {
                requestResponse: JSON.stringify(response),
            });

            yield* this.trackAvailability(false, {
                activityName: ActivityAction.getScanResult,
                requestResponse: JSON.stringify(response),
            });

            throw new Error(`Request failed ${JSON.stringify(response)}`);
        }
    }

    private *getScanIdFromResponse(
        response: SerializableResponse,
        activityName: string,
    ): Generator<Task, string, SerializableResponse & void> {
        const body = response.body as ScanRunResponse[];
        const scanRunResponse = body[0];
        if (scanRunResponse.error !== undefined) {
            this.logOrchestrationStep('Scan request failed', LogLevel.error, {
                requestResponse: JSON.stringify(response),
            });

            yield* this.trackAvailability(false, {
                activityName: activityName,
                requestResponse: JSON.stringify(response),
            });

            throw new Error(`Request failed ${JSON.stringify(response)}`);
        }

        return scanRunResponse.scanId;
    }
}
