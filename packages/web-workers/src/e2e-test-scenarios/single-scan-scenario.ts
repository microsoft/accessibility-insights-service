// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SerializableResponse } from 'common';
// eslint-disable-next-line import/no-internal-modules
import { Task, TaskSet } from 'durable-functions/lib/src/classes';
import { TestContextData } from 'functional-tests';
import { OrchestrationSteps } from '../orchestration-steps';
import { E2EScanScenario } from './e2e-scan-scenario';
import { E2EScanScenarioDefinition } from './e2e-scan-scenario-definitions';

export class SingleScanScenario implements E2EScanScenario {
    protected readonly testContextData: TestContextData;

    constructor(private readonly orchestrationSteps: OrchestrationSteps, public readonly testDefinition: E2EScanScenarioDefinition) {
        this.testContextData = {
            scanUrl: this.testDefinition.scanRequestDef.url,
        };
    }

    public *submitScanPhase(): Generator<Task | TaskSet, void, SerializableResponse & void> {
        const requestDef = this.testDefinition.scanRequestDef;
        this.testContextData.scanId = yield* this.orchestrationSteps.invokeSubmitScanRequestRestApi(requestDef.url, requestDef.options);

        yield* this.orchestrationSteps.runFunctionalTestGroups(
            this.testContextData,
            this.testDefinition.testGroups.postScanSubmissionTests,
        );

        yield* this.orchestrationSteps.validateScanRequestSubmissionState(this.testContextData.scanId);
    }

    public *waitForScanCompletionPhase(): Generator<Task | TaskSet, void, SerializableResponse & void> {
        const scanRunStatus = yield* this.orchestrationSteps.waitForScanRequestCompletion(this.testContextData.scanId);
        yield* this.orchestrationSteps.runFunctionalTestGroups(
            this.testContextData,
            this.testDefinition.testGroups.postScanCompletionTests,
        );

        const reportId = scanRunStatus.reports[0].reportId;
        yield* this.orchestrationSteps.invokeGetScanReportRestApi(this.testContextData.scanId, reportId);
        yield* this.orchestrationSteps.runFunctionalTestGroups(this.testContextData, this.testDefinition.testGroups.scanReportTests);
    }

    public *afterScanCompletedPhase(): Generator<Task | TaskSet, void, SerializableResponse & void> {
        // Wait for scan notification
        yield* this.orchestrationSteps.waitForScanCompletionNotification(this.testContextData.scanId);
        yield* this.orchestrationSteps.runFunctionalTestGroups(
            this.testContextData,
            this.testDefinition.testGroups.postScanCompletionNotificationTests,
        );
    }
}
