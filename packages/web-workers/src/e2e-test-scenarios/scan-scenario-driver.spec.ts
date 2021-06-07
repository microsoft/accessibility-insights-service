// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { TestContextData, TestGroupName } from 'functional-tests';
import { Mock, IMock, It } from 'typemoq';
import { PostScanRequestOptions } from 'web-api-client';
import { E2ETestGroupNames } from '../e2e-test-group-names';
import { OrchestrationSteps } from '../orchestration/orchestration-steps';
import { GeneratorExecutor } from '../test-utilities/generator-executor';
import { generatorStub } from '../test-utilities/generator-function';
import { E2EScanScenarioDefinition } from './e2e-scan-scenario-definitions';
import { ScanScenarioDriver } from './scan-scenario-driver';

/* eslint-disable @typescript-eslint/tslint/config */

class TestableSingleScanScenario extends ScanScenarioDriver {
    public testContextData: TestContextData;

    public encounteredError: boolean;

    constructor(orchestrationSteps: OrchestrationSteps, testDefinition: E2EScanScenarioDefinition) {
        super(orchestrationSteps, testDefinition);
    }
}

describe(ScanScenarioDriver, () => {
    let orchestrationStepsMock: IMock<OrchestrationSteps>;

    // Callback mocks to check whether or the generators created by
    // OrchestrationSteps were actually executed
    let testsRunCallback: jest.Mock;
    let scanSubmissionCallback: jest.Mock;
    let scanWaitCallback: jest.Mock;
    let scanNotificationCallback: jest.Mock;
    let deepScanWaitCallback: jest.Mock;
    let trackScanSucceededCallback: jest.Mock;

    const scanUrl = 'url';
    const scanId = 'scan id';
    const testGroupNames: Partial<E2ETestGroupNames> = {
        postScanSubmissionTests: ['PostScan'],
        postScanCompletionTests: ['SingleScanPostCompletion'],
        scanReportTests: ['ScanReports'],
        postScanCompletionNotificationTests: ['ScanCompletionNotification'],
        postDeepScanCompletionTests: ['ConsolidatedScanReports'],
    };
    const scanOptions: PostScanRequestOptions = {};
    const scenarioName = 'TestScenario';
    let testError: Error;

    let testDefinition: E2EScanScenarioDefinition;

    let testSubject: TestableSingleScanScenario;

    beforeEach(() => {
        testDefinition = {
            readableName: scenarioName,
            testGroups: testGroupNames,
            initialTestContextData: {
                scanUrl,
            },
            scanOptions,
        };
        testError = new Error('test error');

        orchestrationStepsMock = Mock.ofType<OrchestrationSteps>();
        setupAllGeneratorCallbacks();

        testSubject = new TestableSingleScanScenario(orchestrationStepsMock.object, testDefinition);
    });

    afterEach(() => {
        orchestrationStepsMock.verifyAll();
    });

    describe('submitScanPhase', () => {
        const expectedTestContextData: TestContextData = {
            scanUrl,
            scanId: scanId,
        };

        it('submits scan and runs tests', () => {
            orchestrationStepsMock.setup((o) => o.invokeSubmitScanRequestRestApi(scanUrl, scanOptions)).verifiable();
            orchestrationStepsMock
                .setup((o) => o.runFunctionalTestGroups(scenarioName, expectedTestContextData, testGroupNames.postScanSubmissionTests))
                .verifiable();

            const generatorExecutor = new GeneratorExecutor(testSubject.submitScanPhase());
            generatorExecutor.runTillEnd();

            expect(scanSubmissionCallback).toHaveBeenCalled();
            expect(testsRunCallback).toHaveBeenCalled();
        });

        it('Runs tests if scan submission throws', () => {
            scanSubmissionCallback.mockImplementation(() => {
                throw testError;
            });
            orchestrationStepsMock.setup((o) => o.invokeSubmitScanRequestRestApi(scanUrl, scanOptions)).verifiable();
            orchestrationStepsMock
                .setup((o) => o.runFunctionalTestGroups(scenarioName, { scanUrl }, testGroupNames.postScanSubmissionTests))
                .verifiable();

            const generatorExecutor = new GeneratorExecutor(testSubject.submitScanPhase());
            generatorExecutor.runTillEnd();

            expect(testsRunCallback).toHaveBeenCalled();
            expect(testSubject.encounteredError).toBeTruthy();
        });
    });

    describe('waitForScanCompletionPhase', () => {
        const testContextData: TestContextData = {
            scanUrl,
            scanId: scanId,
        };
        let expectedTests: TestGroupName[];

        beforeEach(() => {
            expectedTests = testGroupNames.postScanCompletionTests.concat(testGroupNames.scanReportTests);
            testSubject.testContextData = testContextData;
        });

        it('waits for completion and runs tests', () => {
            orchestrationStepsMock.setup((o) => o.waitForBaseScanCompletion(scanId)).verifiable();
            orchestrationStepsMock.setup((o) => o.runFunctionalTestGroups(scenarioName, testContextData, expectedTests)).verifiable();

            const generatorExecutor = new GeneratorExecutor(testSubject.waitForScanCompletionPhase());
            generatorExecutor.runTillEnd();

            expect(scanWaitCallback).toHaveBeenCalled();
            expect(testsRunCallback).toHaveBeenCalled();
        });

        it('Runs tests if wait throws', () => {
            scanWaitCallback.mockImplementation(() => {
                throw testError;
            });
            orchestrationStepsMock.setup((o) => o.waitForBaseScanCompletion(scanId)).verifiable();
            orchestrationStepsMock.setup((o) => o.runFunctionalTestGroups(scenarioName, testContextData, expectedTests)).verifiable();

            const generatorExecutor = new GeneratorExecutor(testSubject.waitForScanCompletionPhase());
            generatorExecutor.runTillEnd();

            expect(testsRunCallback).toHaveBeenCalled();
            expect(testSubject.encounteredError).toBeTruthy();
        });

        it('Does not wait if there was a previous error', () => {
            testSubject.encounteredError = true;
            orchestrationStepsMock.setup((o) => o.waitForBaseScanCompletion(It.isAny())).verifiable();
            orchestrationStepsMock.setup((o) => o.runFunctionalTestGroups(scenarioName, testContextData, expectedTests)).verifiable();

            const generatorExecutor = new GeneratorExecutor(testSubject.waitForScanCompletionPhase());
            generatorExecutor.runTillEnd();

            expect(scanWaitCallback).toBeCalledTimes(0);
            expect(testsRunCallback).toHaveBeenCalled();
        });
    });

    describe('afterScanCompletionPhase', () => {
        const testContextData: TestContextData = {
            scanUrl,
            scanId: scanId,
        };

        beforeEach(() => {
            testSubject.testContextData = testContextData;
        });

        describe('with no scan request options', () => {
            it('tracks request completed if scan succeeded', () => {
                const generatorExecutor = new GeneratorExecutor(testSubject.afterScanCompletedPhase());
                generatorExecutor.runTillEnd();

                expect(deepScanWaitCallback).toHaveBeenCalledTimes(0);
                expect(scanNotificationCallback).toHaveBeenCalledTimes(0);
                expect(trackScanSucceededCallback).toHaveBeenCalled();
            });

            it('does not track request completed if a previous step caused an error', () => {
                testSubject.encounteredError = true;

                const generatorExecutor = new GeneratorExecutor(testSubject.afterScanCompletedPhase());
                generatorExecutor.runTillEnd();

                expect(trackScanSucceededCallback).toHaveBeenCalledTimes(0);
            });
        });

        describe('with scan notification url', () => {
            beforeEach(() => {
                testDefinition.scanOptions = {
                    scanNotificationUrl: 'scan-notify-url',
                };
                orchestrationStepsMock.setup((o) => o.waitForScanCompletionNotification(scanId)).verifiable();
                orchestrationStepsMock
                    .setup((o) =>
                        o.runFunctionalTestGroups(scenarioName, testContextData, testGroupNames.postScanCompletionNotificationTests),
                    )
                    .verifiable();
            });

            it('runs tests and tracks request completed if notification succeeds', () => {
                const generatorExecutor = new GeneratorExecutor(testSubject.afterScanCompletedPhase());
                generatorExecutor.runTillEnd();

                expect(deepScanWaitCallback).toHaveBeenCalledTimes(0);
                expect(scanNotificationCallback).toHaveBeenCalled();
                expect(testsRunCallback).toHaveBeenCalled();
                expect(trackScanSucceededCallback).toHaveBeenCalled();
            });

            it('runs tests and does not track request completed if notification errors', () => {
                scanNotificationCallback.mockImplementation(() => {
                    throw testError;
                });
                const generatorExecutor = new GeneratorExecutor(testSubject.afterScanCompletedPhase());
                generatorExecutor.runTillEnd();

                expect(deepScanWaitCallback).toHaveBeenCalledTimes(0);
                expect(scanNotificationCallback).toHaveBeenCalled();
                expect(testsRunCallback).toHaveBeenCalled();
                expect(trackScanSucceededCallback).toHaveBeenCalledTimes(0);
            });

            it('does not wait for notification if there was a previous error', () => {
                testSubject.encounteredError = true;
                const generatorExecutor = new GeneratorExecutor(testSubject.afterScanCompletedPhase());
                generatorExecutor.runTillEnd();

                expect(deepScanWaitCallback).toHaveBeenCalledTimes(0);
                expect(scanNotificationCallback).toHaveBeenCalledTimes(0);
                expect(testsRunCallback).toHaveBeenCalled();
                expect(trackScanSucceededCallback).toHaveBeenCalledTimes(0);
            });
        });

        describe('with deepScan=true', () => {
            beforeEach(() => {
                testDefinition.scanOptions = {
                    deepScan: true,
                };
                orchestrationStepsMock.setup((o) => o.waitForDeepScanCompletion(scanId)).verifiable();
                orchestrationStepsMock
                    .setup((o) => o.runFunctionalTestGroups(scenarioName, testContextData, testGroupNames.postDeepScanCompletionTests))
                    .verifiable();
            });

            it('runs tests and tracks request completed if deep scan wait succeeds', () => {
                const generatorExecutor = new GeneratorExecutor(testSubject.afterScanCompletedPhase());
                generatorExecutor.runTillEnd();

                expect(deepScanWaitCallback).toHaveBeenCalled();
                expect(scanNotificationCallback).toHaveBeenCalledTimes(0);
                expect(testsRunCallback).toHaveBeenCalled();
                expect(trackScanSucceededCallback).toHaveBeenCalled();
            });

            it('runs tests and does not track request completed if deep scan wait throws', () => {
                deepScanWaitCallback.mockImplementation(() => {
                    throw testError;
                });

                const generatorExecutor = new GeneratorExecutor(testSubject.afterScanCompletedPhase());
                generatorExecutor.runTillEnd();

                expect(deepScanWaitCallback).toHaveBeenCalled();
                expect(scanNotificationCallback).toHaveBeenCalledTimes(0);
                expect(testsRunCallback).toHaveBeenCalled();
                expect(trackScanSucceededCallback).toHaveBeenCalledTimes(0);
            });

            it('runs tests but does not wait for deep scan if there was a previous error', () => {
                testSubject.encounteredError = true;

                const generatorExecutor = new GeneratorExecutor(testSubject.afterScanCompletedPhase());
                generatorExecutor.runTillEnd();

                expect(deepScanWaitCallback).toHaveBeenCalledTimes(0);
                expect(scanNotificationCallback).toHaveBeenCalledTimes(0);
                expect(testsRunCallback).toHaveBeenCalled();
                expect(trackScanSucceededCallback).toHaveBeenCalledTimes(0);
            });
        });
    });

    function setupAllGeneratorCallbacks(): void {
        testsRunCallback = jest.fn();
        scanSubmissionCallback = jest.fn();
        scanWaitCallback = jest.fn();
        scanNotificationCallback = jest.fn();
        deepScanWaitCallback = jest.fn();
        trackScanSucceededCallback = jest.fn();

        orchestrationStepsMock
            .setup((o) => o.runFunctionalTestGroups(scenarioName, It.isAny(), It.isAny()))
            .returns(() => generatorStub(testsRunCallback));
        orchestrationStepsMock
            .setup((o) => o.invokeSubmitScanRequestRestApi(It.isAny(), It.isAny()))
            .returns(() => generatorStub(scanSubmissionCallback, scanId));
        orchestrationStepsMock.setup((o) => o.waitForBaseScanCompletion(It.isAny())).returns(() => generatorStub(scanWaitCallback));
        orchestrationStepsMock
            .setup((o) => o.waitForScanCompletionNotification(It.isAny()))
            .returns(() => generatorStub(scanNotificationCallback));
        orchestrationStepsMock.setup((o) => o.waitForDeepScanCompletion(It.isAny())).returns(() => generatorStub(deepScanWaitCallback));
        orchestrationStepsMock.setup((o) => o.trackScanRequestCompleted()).returns(() => generatorStub(trackScanSucceededCallback));
    }
});
