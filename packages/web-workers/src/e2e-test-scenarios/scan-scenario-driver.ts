// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SerializableResponse } from 'common';
// eslint-disable-next-line import/no-internal-modules
import { Task, TaskSet } from 'durable-functions/lib/src/classes';
import { TestContextData } from 'functional-tests';
import { OrchestrationSteps } from '../orchestration-steps';
import { E2EScanScenario } from './e2e-scan-scenario';
import { E2EScanScenarioDefinition } from './e2e-scan-scenario-definitions';

export class ScanScenarioDriver implements E2EScanScenario {
    protected readonly testContextData: TestContextData;

    constructor(private readonly orchestrationSteps: OrchestrationSteps, public readonly testDefinition: E2EScanScenarioDefinition) {
        this.testContextData = testDefinition.initialTestContextData;
    }

    public *submitScanPhase(): Generator<Task | TaskSet, void, SerializableResponse & void> {
        this.testContextData.scanId = yield* this.orchestrationSteps.invokeSubmitScanRequestRestApi(
            this.testContextData.scanUrl,
            this.testDefinition.scanOptions,
        );

        yield* this.orchestrationSteps.runFunctionalTestGroups(
            this.testContextData,
            this.testDefinition.testGroups.postScanSubmissionTests,
        );

        yield* this.orchestrationSteps.validateScanRequestSubmissionState(this.testContextData.scanId);
    }

    public *waitForScanCompletionPhase(): Generator<Task | TaskSet, void, SerializableResponse & void> {
        const scanRunStatus = yield* this.orchestrationSteps.waitForBaseScanCompletion(this.testContextData.scanId);
        yield* this.orchestrationSteps.runFunctionalTestGroups(
            this.testContextData,
            this.testDefinition.testGroups.postScanCompletionTests,
        );

        const reportId = scanRunStatus.reports[0].reportId;
        yield* this.orchestrationSteps.invokeGetScanReportRestApi(this.testContextData.scanId, reportId);
        yield* this.orchestrationSteps.runFunctionalTestGroups(this.testContextData, this.testDefinition.testGroups.scanReportTests);
    }

    public *afterScanCompletedPhase(): Generator<Task | TaskSet, void, SerializableResponse & void> {
        const scanRequestOptions = this.testDefinition.scanOptions;
        if (scanRequestOptions?.deepScan) {
            yield* this.afterDeepScan();
        }
        if (scanRequestOptions?.scanNotificationUrl) {
            yield* this.scanNotification();
        }
    }

    private *scanNotification(): Generator<Task | TaskSet, void, SerializableResponse & void> {
        yield* this.orchestrationSteps.waitForScanCompletionNotification(this.testContextData.scanId);
        yield* this.orchestrationSteps.runFunctionalTestGroups(
            this.testContextData,
            this.testDefinition.testGroups.postScanCompletionNotificationTests,
        );
    }

    private *afterDeepScan(): Generator<Task | TaskSet, void, SerializableResponse & void> {
        yield* this.orchestrationSteps.waitForDeepScanCompletion(this.testContextData.scanId);
        yield* this.orchestrationSteps.runFunctionalTestGroups(
            this.testContextData,
            this.testDefinition.testGroups.postDeepScanCompletionTests,
        );
    }
}
