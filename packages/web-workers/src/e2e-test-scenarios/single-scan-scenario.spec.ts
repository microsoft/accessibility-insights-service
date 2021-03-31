// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SerializableResponse } from 'common';
// eslint-disable-next-line import/no-internal-modules
import { Task, TaskSet } from 'durable-functions/lib/src/classes';
import { TestContextData, TestGroupName } from 'functional-tests';
import { ScanCompletedNotification, ScanRunResultResponse } from 'service-library';
import { Mock, MockBehavior, IMock } from 'typemoq';
import { E2ETestGroupNames } from '../e2e-test-group-names';
import { OrchestrationSteps } from '../orchestration-steps';
import { GeneratorExecutor } from '../test-utilities/generator-executor';
import { E2EScanScenarioDefinition, ScanRequestOptions } from './e2e-scan-scenario-definitions';
import { SingleScanScenario } from './single-scan-scenario';

class OrchestrationStepsStub implements OrchestrationSteps {
    public *invokeHealthCheckRestApi(): Generator<Task, void, SerializableResponse> {
        yield undefined;
    }

    public *invokeSubmitScanRequestRestApi(scanRequestOptions: ScanRequestOptions): Generator<Task, string, SerializableResponse> {
        yield undefined;

        return undefined;
    }

    public *validateScanRequestSubmissionState(scanId: string): Generator<Task, void, SerializableResponse & void> {
        yield undefined;
    }

    public *waitForScanRequestCompletion(scanId: string): Generator<Task, ScanRunResultResponse, SerializableResponse & void> {
        yield undefined;

        return undefined;
    }

    public *invokeGetScanReportRestApi(scanId: string, reportId: string): Generator<Task, void, SerializableResponse & void> {
        yield undefined;
    }

    public *waitForScanCompletionNotification(scanId: string): Generator<Task, ScanCompletedNotification, SerializableResponse & void> {
        yield undefined;

        return undefined;
    }

    public *runFunctionalTestGroups(
        testContextData: TestContextData,
        testGroupNames: TestGroupName[],
    ): Generator<TaskSet, void, SerializableResponse & void> {
        yield undefined;
    }

    public logTestRunStart(): void {
        // do nothing
    }
}

class TestableSingleScanScenario extends SingleScanScenario {
    public testContextData: TestContextData;

    constructor(orchestrationSteps: OrchestrationSteps, testDefinition: E2EScanScenarioDefinition) {
        super(orchestrationSteps, testDefinition);
    }
}

describe(SingleScanScenario, () => {
    let orchestrationStepsMock: IMock<OrchestrationStepsStub>;
    const url = 'url';
    const scanId = 'scan id';
    const reportId = 'report id';
    const scanRequestOptions: ScanRequestOptions = {
        urlToScan: url,
        scanNotificationUrl: 'scan-notify-url',
    };
    const testGroupNames: Partial<E2ETestGroupNames> = {
        postScanSubmissionTests: ['PostScan'],
        postScanCompletionTests: ['ScanPreProcessing'],
        scanReportTests: ['ScanReports'],
        postScanCompletionNotificationTests: ['ScanCompletionNotification'],
    };
    const testDefinition: E2EScanScenarioDefinition = {
        requestOptions: scanRequestOptions,
        testGroups: testGroupNames,
    };

    let testSubject: TestableSingleScanScenario;

    beforeEach(() => {
        orchestrationStepsMock = Mock.ofType(OrchestrationStepsStub, MockBehavior.Loose, false);

        testSubject = new TestableSingleScanScenario(orchestrationStepsMock.object, testDefinition);
    });

    afterEach(() => {
        orchestrationStepsMock.verifyAll();
    });

    it('submitScanPhase', () => {
        const expectedTestContextData: TestContextData = {
            scanUrl: url,
            scanId: scanId,
        };
        orchestrationStepsMock
            .setup((o) => o.invokeSubmitScanRequestRestApi(scanRequestOptions))
            .returns(() => generatorStub(scanId))
            .verifiable();
        orchestrationStepsMock
            .setup((o) => o.runFunctionalTestGroups(expectedTestContextData, testGroupNames.postScanSubmissionTests))
            .returns(generatorStub)
            .verifiable();
        orchestrationStepsMock
            .setup((o) => o.validateScanRequestSubmissionState(scanId))
            .returns(generatorStub)
            .verifiable();

        const generatorExecutor = new GeneratorExecutor(testSubject.submitScanPhase());
        generatorExecutor.runTillEnd();
    });

    it('waitForScanCompletionPhase', () => {
        const scanRunStatus = {
            reports: [{ reportId: reportId }],
        } as ScanRunResultResponse;
        const testContextData: TestContextData = {
            scanUrl: url,
            scanId: scanId,
        };

        testSubject.testContextData = testContextData;

        orchestrationStepsMock
            .setup((o) => o.waitForScanRequestCompletion(scanId))
            .returns(() => generatorStub(scanRunStatus))
            .verifiable();
        orchestrationStepsMock
            .setup((o) => o.runFunctionalTestGroups(testContextData, testGroupNames.postScanCompletionTests))
            .returns(generatorStub)
            .verifiable();
        orchestrationStepsMock
            .setup((o) => o.invokeGetScanReportRestApi(scanId, reportId))
            .returns(generatorStub)
            .verifiable();
        orchestrationStepsMock
            .setup((o) => o.runFunctionalTestGroups(testContextData, testGroupNames.scanReportTests))
            .returns(generatorStub)
            .verifiable();

        const generatorExecutor = new GeneratorExecutor(testSubject.waitForScanCompletionPhase());
        generatorExecutor.runTillEnd();
    });

    it('afterScanCompletionPhase', () => {
        const scanCompletedNotification = {} as ScanCompletedNotification;
        const testContextData: TestContextData = {
            scanUrl: url,
            scanId: scanId,
        };

        testSubject.testContextData = testContextData;

        orchestrationStepsMock
            .setup((o) => o.waitForScanCompletionNotification(scanId))
            .returns(() => generatorStub(scanCompletedNotification))
            .verifiable();
        orchestrationStepsMock
            .setup((o) => o.runFunctionalTestGroups(testContextData, testGroupNames.postScanCompletionNotificationTests))
            .returns(generatorStub)
            .verifiable();

        const generatorExecutor = new GeneratorExecutor(testSubject.afterScanCompletedPhase());
        generatorExecutor.runTillEnd();
    });
});

function* generatorStub<YieldType, ReturnType, NextType = unknown>(returnValue?: ReturnType): Generator<YieldType, ReturnType, NextType> {
    yield undefined;

    return returnValue;
}
