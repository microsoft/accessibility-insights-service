// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
/* eslint-disable import/no-internal-modules,  */
import { AvailabilityTestConfig, SerializableResponse } from 'common';
import { IOrchestrationFunctionContext, Task, TaskSet } from 'durable-functions/lib/src/classes';
import { TestContextData, TestEnvironment, TestGroupName } from 'functional-tests';
import { LogLevel } from 'logger';
import { ScanCompletedNotification, ScanRunResponse, ScanRunResultResponse } from 'service-library';
import { PostScanRequestOptions } from 'web-api-client';
import { ActivityAction } from '../contracts/activity-actions';
import {
    ActivityRequestData,
    CreateScanRequestData,
    GetScanReportData,
    LogTestRunStartData,
    TestIdentifier,
} from '../controllers/activity-request-data';
import { ActivityActionDispatcher } from './activity-action-dispatcher';
import { OrchestrationLogger } from './orchestration-logger';
import { ScanWaitConditions } from './scan-wait-conditions';
import { ScanWaitOrchestrator } from './scan-wait-orchestrator';

export class OrchestrationSteps {
    constructor(
        private readonly context: IOrchestrationFunctionContext,
        private readonly availabilityTestConfig: AvailabilityTestConfig,
        private readonly logger: OrchestrationLogger,
        private readonly activityActionDispatcher: ActivityActionDispatcher,
        private readonly scanWaitOrchestrator: ScanWaitOrchestrator,
    ) {}

    public *invokeHealthCheckRestApi(): Generator<Task, void, SerializableResponse & void> {
        yield* this.activityActionDispatcher.callWebRequestActivity(ActivityAction.getHealthStatus);
    }

    public *invokeGetScanReportRestApi(
        scanId: string,
        reportId: string,
    ): Generator<Task, SerializableResponse, SerializableResponse & void> {
        const activityName = ActivityAction.getScanReport;
        const requestData: GetScanReportData = {
            scanId: scanId,
            reportId: reportId,
        };

        return yield* this.activityActionDispatcher.callWebRequestActivity(activityName, requestData);
    }

    public *waitForBaseScanCompletion(scanId: string): Generator<Task, ScanRunResultResponse, SerializableResponse & void> {
        return yield* this.scanWaitOrchestrator.waitFor(
            scanId,
            'waitForBaseScanCompletion',
            this.availabilityTestConfig.maxScanWaitTimeInSeconds,
            this.availabilityTestConfig.scanWaitIntervalInSeconds,
            ScanWaitConditions.baseScan,
        );
    }

    public *waitForScanCompletionNotification(scanId: string): Generator<Task, ScanCompletedNotification, SerializableResponse & void> {
        const scanStatus = yield* this.scanWaitOrchestrator.waitFor(
            scanId,
            'waitForScanCompletionNotification',
            this.availabilityTestConfig.maxScanCompletionNotificationWaitTimeInSeconds,
            this.availabilityTestConfig.scanWaitIntervalInSeconds,
            ScanWaitConditions.scanNotification,
        );

        return scanStatus?.notification;
    }

    public *waitForDeepScanCompletion(scanId: string): Generator<Task, ScanRunResultResponse, SerializableResponse & void> {
        return yield* this.scanWaitOrchestrator.waitFor(
            scanId,
            'waitForDeepScanCompletion',
            this.availabilityTestConfig.maxDeepScanWaitTimeInSeconds,
            this.availabilityTestConfig.scanWaitIntervalInSeconds,
            ScanWaitConditions.deepScan,
        );
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

        const response = yield* this.activityActionDispatcher.callWebRequestActivity(ActivityAction.createScanRequest, requestData);
        const scanId = yield* this.getScanIdFromResponse(response, ActivityAction.createScanRequest);
        this.logger.logOrchestrationStep(`Orchestrator submitted scan with scan Id: ${scanId} and options ${JSON.stringify(scanOptions)}`);

        return scanId;
    }

    public *runFunctionalTestGroups(
        testScenarioName: string,
        testContextData: TestContextData,
        testGroupNames: TestGroupName[],
    ): Generator<TaskSet, void, void> {
        const activities: ActivityRequestData[] = testGroupNames.map((testGroupName: TestGroupName) => {
            return {
                activityName: ActivityAction.runFunctionalTestGroup,
                data: {
                    runId: this.context.df.instanceId,
                    test: {
                        testGroupName,
                        scenarioName: testScenarioName,
                    },
                    testContextData,
                    environment: this.getTestEnvironment(this.availabilityTestConfig.environmentDefinition),
                },
            };
        });

        yield* this.activityActionDispatcher.callActivitiesInParallel(activities, `Run functional tests: ${testGroupNames}`);
    }

    public *logTestRunStart(testsToRun: TestIdentifier[]): Generator<Task, void, SerializableResponse & void> {
        const activityData: LogTestRunStartData = {
            runId: this.context.df.instanceId,
            environmentName: this.availabilityTestConfig.environmentDefinition,
            testsToRun: testsToRun,
        };
        yield* this.activityActionDispatcher.callActivity(ActivityAction.logTestRunStart, activityData);
    }

    public *trackScanRequestCompleted(): Generator<Task, void, SerializableResponse & void> {
        yield* this.activityActionDispatcher.callTrackAvailability(true, {
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

    private *getScanIdFromResponse(
        response: SerializableResponse,
        activityName: string,
    ): Generator<Task, string, SerializableResponse & void> {
        const body = response.body as ScanRunResponse[];
        const scanRunResponse = body[0];
        if (scanRunResponse.error !== undefined) {
            this.logger.logOrchestrationStep('Scan request failed', LogLevel.error, {
                requestResponse: JSON.stringify(response),
            });

            yield* this.activityActionDispatcher.callTrackAvailability(false, {
                activityName: activityName,
                requestResponse: JSON.stringify(response),
            });

            throw new Error(`Request failed ${JSON.stringify(response)}`);
        }

        return scanRunResponse.scanId;
    }
}
