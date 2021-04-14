// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { TestContextData } from 'functional-tests';
import { ScanCompletedNotification, ScanRunResultResponse } from 'service-library';
import { Mock, IMock, MockBehavior, It, Times } from 'typemoq';
import { PostScanRequestOptions } from 'web-api-client';
import { E2ETestGroupNames } from '../e2e-test-group-names';
import { OrchestrationSteps, OrchestrationStepsImpl } from '../orchestration-steps';
import { GeneratorExecutor } from '../test-utilities/generator-executor';
import { generatorStub } from '../test-utilities/generator-function';
import { E2EScanScenarioDefinition } from './e2e-scan-scenario-definitions';
import { ScanScenarioDriver } from './scan-scenario-driver';

class TestableSingleScanScenario extends ScanScenarioDriver {
    public testContextData: TestContextData;

    constructor(orchestrationSteps: OrchestrationSteps, testDefinition: E2EScanScenarioDefinition) {
        super(orchestrationSteps, testDefinition);
    }
}

describe(ScanScenarioDriver, () => {
    let orchestrationStepsMock: IMock<OrchestrationStepsImpl>;
    const scanUrl = 'url';
    const scanId = 'scan id';
    const reportId = 'report id';
    const testGroupNames: Partial<E2ETestGroupNames> = {
        postScanSubmissionTests: ['PostScan'],
        postScanCompletionTests: ['SingleScanPostCompletion'],
        scanReportTests: ['ScanReports'],
        postScanCompletionNotificationTests: ['ScanCompletionNotification'],
        postDeepScanCompletionTests: ['ConsolidatedScanReports'],
    };
    const scanOptions: PostScanRequestOptions = {};

    let testDefinition: E2EScanScenarioDefinition;

    let testSubject: TestableSingleScanScenario;

    beforeEach(() => {
        testDefinition = {
            testGroups: testGroupNames,
            initialTestContextData: {
                scanUrl,
            },
            scanOptions,
        };

        orchestrationStepsMock = Mock.ofType(OrchestrationStepsImpl, MockBehavior.Strict);

        testSubject = new TestableSingleScanScenario(orchestrationStepsMock.object, testDefinition);
    });

    afterEach(() => {
        orchestrationStepsMock.verifyAll();
    });

    it('submitScanPhase', () => {
        const expectedTestContextData: TestContextData = {
            scanUrl,
            scanId: scanId,
        };
        orchestrationStepsMock
            .setup((o) => o.invokeSubmitScanRequestRestApi(scanUrl, scanOptions))
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
            scanUrl,
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

    describe('afterScanCompletionPhase', () => {
        it('with scan notification url', () => {
            testDefinition.scanOptions = {
                scanNotificationUrl: 'scan-notify-url',
            };

            const scanCompletedNotification = {} as ScanCompletedNotification;
            const testContextData: TestContextData = {
                scanUrl,
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
            orchestrationStepsMock
                .setup((o) => o.trackScanRequestCompleted())
                .returns(generatorStub)
                .verifiable();

            const generatorExecutor = new GeneratorExecutor(testSubject.afterScanCompletedPhase());
            generatorExecutor.runTillEnd();
        });

        it('with no scan request options', () => {
            orchestrationStepsMock
                .setup((o) => o.runFunctionalTestGroups(It.isAny(), It.isAny()))
                .returns(generatorStub)
                .verifiable(Times.never());
            orchestrationStepsMock
                .setup((o) => o.trackScanRequestCompleted())
                .returns(generatorStub)
                .verifiable();

            const generatorExecutor = new GeneratorExecutor(testSubject.afterScanCompletedPhase());
            generatorExecutor.runTillEnd();
        });

        it('with deepScan=true', () => {
            testDefinition.scanOptions = {
                deepScan: true,
            };

            const testContextData: TestContextData = {
                scanUrl,
                scanId: scanId,
            };

            testSubject.testContextData = testContextData;

            orchestrationStepsMock
                .setup((o) => o.waitForDeepScanCompletion(scanId))
                .returns(generatorStub)
                .verifiable();
            orchestrationStepsMock
                .setup((o) => o.runFunctionalTestGroups(testContextData, testGroupNames.postDeepScanCompletionTests))
                .returns(generatorStub)
                .verifiable();
            orchestrationStepsMock
                .setup((o) => o.trackScanRequestCompleted())
                .returns(generatorStub)
                .verifiable();

            const generatorExecutor = new GeneratorExecutor(testSubject.afterScanCompletedPhase());
            generatorExecutor.runTillEnd();
        });
    });
});
