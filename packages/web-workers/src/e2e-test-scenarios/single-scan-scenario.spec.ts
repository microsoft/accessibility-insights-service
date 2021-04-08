// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TestContextData } from 'functional-tests';
import { ScanCompletedNotification, ScanRunResultResponse } from 'service-library';
import { Mock, IMock } from 'typemoq';
import { E2ETestGroupNames } from '../e2e-test-group-names';
import { OrchestrationSteps, OrchestrationStepsImpl } from '../orchestration-steps';
import { GeneratorExecutor } from '../test-utilities/generator-executor';
import { generatorStub } from '../test-utilities/generator-function';
import { E2EScanScenarioDefinition, ScanRequestDefinition } from './e2e-scan-scenario-definitions';
import { SingleScanScenario } from './single-scan-scenario';

class TestableSingleScanScenario extends SingleScanScenario {
    public testContextData: TestContextData;

    constructor(orchestrationSteps: OrchestrationSteps, testDefinition: E2EScanScenarioDefinition) {
        super(orchestrationSteps, testDefinition);
    }
}

describe(SingleScanScenario, () => {
    let orchestrationStepsMock: IMock<OrchestrationStepsImpl>;
    const url = 'url';
    const scanId = 'scan id';
    const reportId = 'report id';
    const scanRequestDef: ScanRequestDefinition = {
        url: url,
        options: {
            scanNotificationUrl: 'scan-notify-url',
        },
    };
    const testGroupNames: Partial<E2ETestGroupNames> = {
        postScanSubmissionTests: ['PostScan'],
        postScanCompletionTests: ['ScanPreProcessing'],
        scanReportTests: ['ScanReports'],
        postScanCompletionNotificationTests: ['ScanCompletionNotification'],
    };
    const testDefinition: E2EScanScenarioDefinition = {
        scanRequestDef: scanRequestDef,
        testGroups: testGroupNames,
    };

    let testSubject: TestableSingleScanScenario;

    beforeEach(() => {
        orchestrationStepsMock = Mock.ofType<OrchestrationStepsImpl>();

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
            .setup((o) => o.invokeSubmitScanRequestRestApi(url, scanRequestDef.options))
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
            .setup((o) => o.waitForBaseScanCompletion(scanId))
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
