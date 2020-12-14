// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
/* eslint-disable import/no-internal-modules,  */
import { AvailabilityTestConfig, SerializableResponse } from 'common';
import { IOrchestrationFunctionContext, Task, TaskSet } from 'durable-functions/lib/src/classes';
import { TestContextData, TestEnvironment, TestGroupName } from 'functional-tests';
import { isNil } from 'lodash';
import { Logger, LogLevel } from 'logger';
import moment from 'moment';
import { RunState, ScanRunErrorResponse, ScanRunResponse, ScanRunResultResponse } from 'service-library';
import { ActivityAction } from './contracts/activity-actions';
import {
    ActivityRequestData,
    CreateScanRequestData,
    GetScanReportData,
    GetScanResultData,
    RunFunctionalTestGroupData,
    TrackAvailabilityData,
    CreateConsolidatedScanRequestData,
} from './controllers/activity-request-data';
import { getAllTestGroupClassNames } from './e2e-test-group-names';

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
    invokeSubmitScanRequestRestApi(url: string): Generator<Task, string, SerializableResponse>;
    invokeSubmitConsolidatedScanRequestRestApi(url: string, reportId: string): Generator<Task, string, SerializableResponse>;
    validateScanRequestSubmissionState(scanId: string): Generator<Task, void, SerializableResponse & void>;
    waitForScanRequestCompletion(scanId: string): Generator<Task, ScanRunResultResponse, SerializableResponse & void>;
    invokeGetScanReportRestApi(scanId: string, reportId: string): Generator<Task, void, SerializableResponse & void>;
    runFunctionalTestGroups(
        testContextData: TestContextData,
        testGroupNames: TestGroupName[],
    ): Generator<TaskSet, void, SerializableResponse & void>;
    logTestRunStart(): void;
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

        yield* this.trackAvailability(true, {
            activityName,
        });

        this.logOrchestrationStep('Successfully fetched scan report');
    }

    public *waitForScanRequestCompletion(scanId: string): Generator<Task, ScanRunResultResponse, SerializableResponse & void> {
        let scanRunState: RunState = 'pending';
        let scanStatus: ScanRunResultResponse;
        const waitStartTime = moment.utc(this.context.df.currentUtcDateTime);
        const waitEndTime = waitStartTime.clone().add(this.availabilityTestConfig.maxScanWaitTimeInSeconds, 'seconds');
        const scanWaitIntervalInSeconds = this.availabilityTestConfig.scanWaitIntervalInSeconds;
        let scanStatusResponse: SerializableResponse;

        this.logOrchestrationStep('Starting wait for scan request completion');

        while (
            scanRunState !== 'completed' &&
            scanRunState !== 'failed' &&
            moment.utc(this.context.df.currentUtcDateTime).isBefore(waitEndTime)
        ) {
            this.logOrchestrationStep(`Starting timer with wait time ${scanWaitIntervalInSeconds}`, LogLevel.info, {
                waitStartTime: waitStartTime.toJSON(),
                waitEndTime: waitEndTime.toJSON(),
            });

            const timerOutput = yield this.context.df.createTimer(
                moment.utc(this.context.df.currentUtcDateTime).add(scanWaitIntervalInSeconds, 'seconds').toDate(),
            );

            this.logOrchestrationStep('Timer completed', LogLevel.info, {
                requestResponse: JSON.stringify(timerOutput),
                waitStartTime: waitStartTime.toJSON(),
                waitEndTime: waitEndTime.toJSON(),
            });

            scanStatusResponse = yield* this.callGetScanStatusActivity(scanId);
            scanStatus = yield* this.getScanStatus(scanStatusResponse);

            scanRunState = scanStatus.run.state;
        }

        const totalWaitTimeInSeconds = moment.utc(this.context.df.currentUtcDateTime).diff(moment.utc(waitStartTime), 'seconds');

        if (scanRunState === 'completed') {
            this.logOrchestrationStep('Wait for scan request completion succeeded', LogLevel.info, {
                totalWaitTimeInSeconds: totalWaitTimeInSeconds.toString(),
                waitStartTime: waitStartTime.toJSON(),
                waitEndTime: waitEndTime.toJSON(),
            });
        } else {
            const scanStatusResponseString = JSON.stringify(scanStatusResponse);

            yield* this.trackAvailability(false, {
                activityName: 'waitForScanCompletion',
                requestResponse: scanStatusResponseString,
            });

            const traceData = {
                requestResponse: scanStatusResponseString,
                totalWaitTimeInSeconds: totalWaitTimeInSeconds.toString(),
                waitStartTime: waitStartTime.toJSON(),
                waitEndTime: waitEndTime.toJSON(),
            };
            this.logOrchestrationStep('Wait for scan request completion failed', LogLevel.error, traceData);

            throw new Error(`Wait for scan request completion failed. ${JSON.stringify(traceData)}`);
        }

        return scanStatus;
    }

    public *validateScanRequestSubmissionState(scanId: string): Generator<Task, void, SerializableResponse & void> {
        const response = yield* this.callGetScanStatusActivity(scanId);
        yield* this.getScanStatus(response);
        this.logOrchestrationStep('Verified scan submitted successfully', LogLevel.info, { requestResponse: JSON.stringify(response) });
    }

    public *invokeSubmitScanRequestRestApi(url: string): Generator<Task, string, SerializableResponse & void> {
        const requestData: CreateScanRequestData = {
            scanUrl: url,
            priority: 1000,
        };

        const response = yield* this.callWebRequestActivity(ActivityAction.createScanRequest, requestData);
        const scanId = yield* this.getScanIdFromResponse(response, ActivityAction.createScanRequest);
        this.logOrchestrationStep(`Orchestrator submitted scan with scan Id: ${scanId}`);

        return scanId;
    }

    public *invokeSubmitConsolidatedScanRequestRestApi(
        url: string,
        reportId: string,
    ): Generator<Task, string, SerializableResponse & void> {
        const requestData: CreateConsolidatedScanRequestData = {
            scanUrl: url,
            reportId: reportId,
            priority: 1000,
        };

        const response = yield* this.callWebRequestActivity(ActivityAction.createConsolidatedScanRequest, requestData);
        const scanId = yield* this.getScanIdFromResponse(response, ActivityAction.createConsolidatedScanRequest);
        this.logOrchestrationStep(`Orchestrator submitted consolidated scan request with scan Id: ${scanId}`);

        return scanId;
    }

    public *runFunctionalTestGroups(testContextData: TestContextData, testGroupNames: TestGroupName[]): Generator<TaskSet, void, void> {
        const parallelTasks = testGroupNames.map((testGroupName: TestGroupName) => {
            const testData: RunFunctionalTestGroupData = {
                runId: this.context.df.instanceId,
                testGroupName,
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

    public logTestRunStart(getTestGroupNamesFunc: () => string[] = getAllTestGroupClassNames): void {
        const testGroupNamesStr = getTestGroupNamesFunc().join(',');
        const properties = {
            ...this.getDefaultLogProperties(),
            source: 'BeginTestSuite',
            functionalTestGroups: testGroupNamesStr,
            runId: this.context.df.instanceId,
            releaseId: process.env.RELEASE_VERSION,
            environment: this.availabilityTestConfig.environmentDefinition,
        };
        this.logger.trackEvent('FunctionalTest', properties);
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
