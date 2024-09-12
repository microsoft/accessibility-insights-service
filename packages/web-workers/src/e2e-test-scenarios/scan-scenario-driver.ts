// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SerializableResponse } from 'common';
import { TestContextData, TestGroupName } from 'functional-tests';
import { Task } from 'durable-functions';
import { compact, uniq } from 'lodash';
import { OrchestrationSteps } from '../orchestration/orchestration-steps';
import { E2EScanScenarioDefinition } from './e2e-scan-scenario-definitions';

export class ScanScenarioDriver {
    protected readonly testContextData: TestContextData;

    protected encounteredError: boolean = false;

    constructor(private readonly orchestrationSteps: OrchestrationSteps, public readonly testDefinition: E2EScanScenarioDefinition) {
        this.testContextData = testDefinition.initialTestContextData;
    }

    public *submitScanPhase(): Generator<Task, void, SerializableResponse & void> {
        yield* this.skipIfError(this.submitScanForTests(), this.testDefinition.testGroups.postScanSubmissionTests);
    }

    public *waitForScanCompletionPhase(): Generator<Task, void, SerializableResponse & void> {
        let testsToRun = [].concat(this.testDefinition.testGroups.postScanCompletionTests, this.testDefinition.testGroups.scanReportTests);
        testsToRun = uniq(compact(testsToRun));
        yield* this.skipIfError(this.orchestrationSteps.waitForBaseScanCompletion(this.testContextData.scanId), testsToRun);
    }

    public *afterScanCompletedPhase(): Generator<Task, void, SerializableResponse & void> {
        const scanRequestOptions = this.testDefinition.scanOptions;
        if (scanRequestOptions.deepScan) {
            yield* this.skipIfError(
                this.orchestrationSteps.waitForDeepScanCompletion(this.testContextData.scanId),
                this.testDefinition.testGroups.postDeepScanCompletionTests,
            );
        }
        if (scanRequestOptions.scanNotificationUrl) {
            yield* this.skipIfError(
                this.orchestrationSteps.waitForScanCompletionNotification(this.testContextData.scanId),
                this.testDefinition.testGroups.postScanCompletionNotificationTests,
            );
        }
        yield* this.skipIfError(this.orchestrationSteps.trackScanRequestCompleted());
    }

    private *submitScanForTests(): Generator<Task, void, SerializableResponse & void> {
        this.testContextData.scanId = yield* this.orchestrationSteps.invokeSubmitScanRequestRestApi(
            this.testContextData.scanUrl,
            this.testDefinition.scanOptions,
        );
    }

    /*
    We skip orchestrator steps if we encounter execution errors,
    but initiate functional test groups regardless. This ensures
    that a failure in a 'wait' step doesn't preclude other scenarios
    from running, and that functional test groups are still able
    to report failure.
    */
    private *skipIfError(
        generator: Generator<Task, unknown, SerializableResponse & void>,
        testGroupNames?: TestGroupName[],
    ): Generator<Task, void, SerializableResponse & void> {
        if (this.encounteredError !== true) {
            try {
                yield* generator;
            } catch {
                this.encounteredError = true;
            }
        }

        yield* this.orchestrationSteps.runFunctionalTestGroups(this.testDefinition.readableName, this.testContextData, testGroupNames);
    }
}
