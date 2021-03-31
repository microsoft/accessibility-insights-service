// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { AvailabilityTestConfig, SerializableResponse, ServiceConfiguration } from 'common';
import * as durableFunctions from 'durable-functions';
// eslint-disable-next-line import/no-internal-modules
import { IOrchestrationFunctionContext, Task, TaskSet } from 'durable-functions/lib/src/classes';
import { TestContextData, TestEnvironment, TestGroupName } from 'functional-tests';
import { Logger } from 'logger';
import { ScanRunResultResponse, ScanCompletedNotification } from 'service-library';
import { IMock, It, Mock, Times, MockBehavior } from 'typemoq';
import { OrchestrationSteps } from '../orchestration-steps';
import { GeneratorExecutor } from '../test-utilities/generator-executor';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { ScanRequestOptions } from '../e2e-test-scenarios/e2e-scan-scenario-definitions';
import { HealthMonitorOrchestrationController } from './health-monitor-orchestration-controller';
import { WebApiConfig } from './web-api-config';

/* eslint-disable
  no-empty,
  @typescript-eslint/no-empty-function,
  @typescript-eslint/no-explicit-any,
  @typescript-eslint/consistent-type-assertions
*/

class TestableHealthMonitorOrchestrationController extends HealthMonitorOrchestrationController {
    public orchestrationStepsCreated: boolean = false;

    constructor(
        public orchestrationStepsStub: OrchestrationStepsStub,
        public context: Context,
        public availabilityTestConfig: AvailabilityTestConfig,
        serviceConfig: ServiceConfiguration,
        logger: Logger,
        webApiConfig: WebApiConfig,
        df: typeof durableFunctions,
    ) {
        super(serviceConfig, logger, webApiConfig, df);
    }

    protected createOrchestrationSteps(
        context: IOrchestrationFunctionContext,
        availabilityTestConfig: AvailabilityTestConfig,
    ): OrchestrationSteps {
        expect(context).toBe(this.context);
        expect(availabilityTestConfig).toBe(this.availabilityTestConfig);
        this.orchestrationStepsCreated = true;

        return this.orchestrationStepsStub;
    }
}

export interface OrchestratorStepsCallCount {
    callHealthCheckCount: number;
    getScanReportCount: number;
    waitForScanCompletionCount: number;
    waitForScanCompletionNotificationCount: number;
    verifyScanSubmittedCount: number;
    callSubmitScanRequest: number;
    runFunctionalTestsCount: number;
    logTestRunStartCount: number;
}

const baseWebApiUrl = 'some-url';
const releaseId = '123';

class OrchestrationStepsStub implements OrchestrationSteps {
    public orchestratorStepsCallCount: OrchestratorStepsCallCount = {
        callHealthCheckCount: 0,
        getScanReportCount: 0,
        waitForScanCompletionCount: 0,
        waitForScanCompletionNotificationCount: 0,
        verifyScanSubmittedCount: 0,
        callSubmitScanRequest: 0,
        runFunctionalTestsCount: 0,
        logTestRunStartCount: 0,
    };

    public scanId = 'scan-id';
    public reportId = 'report-id';
    public shouldThrowException = false;
    public functionalTestsRun: TestGroupName[] = [];

    constructor(private readonly availabilityTestConfig: AvailabilityTestConfig) {}

    public *invokeHealthCheckRestApi(): Generator<Task, void, SerializableResponse> {
        this.orchestratorStepsCallCount.callHealthCheckCount += 1;
        this.throwExceptionIfExpected();
        yield undefined;
    }

    public *invokeGetScanReportRestApi(scanId: string, reportId: string): Generator<Task, void, SerializableResponse & void> {
        this.orchestratorStepsCallCount.getScanReportCount += 1;
        this.throwExceptionIfExpected();
        expect(scanId).toBe(this.scanId);
        expect(reportId).toBe(this.reportId);

        yield undefined;
    }

    public *waitForScanRequestCompletion(scanId: string): Generator<any, ScanRunResultResponse, any> {
        this.orchestratorStepsCallCount.waitForScanCompletionCount += 1;
        this.throwExceptionIfExpected();
        expect(scanId).toBe(this.scanId);

        const scanRunResultResponse = {
            scanId: 'scanId',
            url: 'url',
            reports: [
                {
                    reportId: this.reportId,
                },
            ],
            run: {
                state: 'completed',
            },
        } as ScanRunResultResponse;

        return yield scanRunResultResponse;
    }

    public *waitForScanCompletionNotification(scanId: string): Generator<any, ScanCompletedNotification, any> {
        this.orchestratorStepsCallCount.waitForScanCompletionNotificationCount += 1;
        this.throwExceptionIfExpected();
        expect(scanId).toBe(this.scanId);

        const scanRunResultResponse = {} as ScanCompletedNotification;

        return yield scanRunResultResponse;
    }

    public *validateScanRequestSubmissionState(scanId: string): Generator<Task, void, SerializableResponse & void> {
        this.orchestratorStepsCallCount.verifyScanSubmittedCount += 1;
        this.throwExceptionIfExpected();
        expect(scanId).toBe(this.scanId);

        yield undefined;
    }

    public *invokeSubmitScanRequestRestApi(options: ScanRequestOptions): Generator<any, string, any> {
        this.orchestratorStepsCallCount.callSubmitScanRequest += 1;
        this.throwExceptionIfExpected();
        expect(options.urlToScan).toBe(this.availabilityTestConfig.urlToScan);
        expect(options.scanNotificationUrl).toEqual(`${baseWebApiUrl}${this.availabilityTestConfig.scanNotifyApiEndpoint}`);

        return yield this.scanId;
    }

    public *runFunctionalTestGroups(
        testContextData: TestContextData,
        testGroupNames: TestGroupName[],
    ): Generator<TaskSet, void, SerializableResponse & void> {
        this.orchestratorStepsCallCount.runFunctionalTestsCount += 1;
        this.functionalTestsRun.push(...testGroupNames);
        this.throwExceptionIfExpected();

        yield undefined;
    }

    public logTestRunStart(): void {
        this.orchestratorStepsCallCount.logTestRunStartCount += 1;
    }

    private throwExceptionIfExpected(): void {
        if (this.shouldThrowException) {
            throw new Error('test error at orchestration step');
        }
    }
}

describe('HealthMonitorOrchestrationController', () => {
    let testSubject: TestableHealthMonitorOrchestrationController;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<MockableLogger>;
    let contextStub: IOrchestrationFunctionContext;
    let df: IMock<typeof durableFunctions>;
    let availabilityTestConfig: AvailabilityTestConfig;

    let orchestratorGeneratorMock: IMock<(ctxt: IOrchestrationFunctionContext) => void>;
    let orchestratorStepsStub: OrchestrationStepsStub;
    let orchestratorIterator: GeneratorExecutor;
    let webApiConfig: WebApiConfig;

    beforeEach(() => {
        availabilityTestConfig = {
            urlToScan: 'some-url',
            scanWaitIntervalInSeconds: 10,
            maxScanWaitTimeInSeconds: 20,
            logQueryTimeRange: 'P1D',
            environmentDefinition: TestEnvironment[TestEnvironment.canary],
            consolidatedIdBase: 'somereportid',
            scanNotifyApiEndpoint: '/some-endpoint',
            maxScanCompletionNotificationWaitTimeInSeconds: 30,
            scanNotifyFailApiEndpoint: '/some-fail-endpoint',
        };

        serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
        loggerMock = Mock.ofType(MockableLogger);
        orchestratorStepsStub = new OrchestrationStepsStub(availabilityTestConfig);

        webApiConfig = {
            baseUrl: baseWebApiUrl,
        };

        contextStub = ({
            bindingData: {},
            executionContext: {
                functionName: 'function-name',
                invocationId: 'id',
            },
        } as unknown) as IOrchestrationFunctionContext;

        df = Mock.ofType<typeof durableFunctions>(undefined);

        orchestratorGeneratorMock = Mock.ofInstance<(contextObj: IOrchestrationFunctionContext) => void>(() => {});

        df.setup((d) => d.orchestrator(It.isAny()))
            .callback((fn: (context: IOrchestrationFunctionContext) => IterableIterator<unknown>) => {
                orchestratorIterator = new GeneratorExecutor(fn(contextStub));
            })
            .returns(() => orchestratorGeneratorMock.object);

        process.env.RELEASE_VERSION = releaseId;

        testSubject = new TestableHealthMonitorOrchestrationController(
            orchestratorStepsStub,
            contextStub,
            availabilityTestConfig,
            serviceConfigurationMock.object,
            loggerMock.object,
            webApiConfig,
            df.object,
        );
    });

    it('does not invoke orchestrator executor on construction', () => {
        expect(orchestratorIterator).toBeUndefined();
    });

    describe('invoke', () => {
        beforeEach(() => {
            setupServiceConfig();
        });

        it('should use context passed by orchestrator', async () => {
            const newAvailabilityTestConfig = { ...availabilityTestConfig };
            newAvailabilityTestConfig.maxScanWaitTimeInSeconds += 1;

            const orchestrationFuncContext = ({
                bindingData: {
                    controller: testSubject,
                    availabilityTestConfig: newAvailabilityTestConfig,
                },
            } as unknown) as IOrchestrationFunctionContext;

            df.reset();
            df.setup((d) => d.orchestrator(It.isAny()))
                .callback((fn: (context: IOrchestrationFunctionContext) => IterableIterator<unknown>) => {
                    orchestratorIterator = new GeneratorExecutor(fn(orchestrationFuncContext));
                })
                .returns(() => orchestratorGeneratorMock.object);

            await testSubject.invoke(contextStub);

            testSubject.context = orchestrationFuncContext;
            testSubject.availabilityTestConfig = newAvailabilityTestConfig;

            orchestratorIterator.next();

            expect(testSubject.orchestrationStepsCreated).toBe(true);
        });

        it('sets context required for orchestrator execution', async () => {
            await testSubject.invoke(contextStub);
            expect(contextStub.bindingData.controller).toBe(testSubject);
            expect(contextStub.bindingData.availabilityTestConfig).toEqual(availabilityTestConfig);
        });

        it('executes orchestrator', async () => {
            await testSubject.invoke(contextStub);

            expect(orchestratorIterator).toBeDefined();
            orchestratorGeneratorMock.verify((g) => g(contextStub), Times.once());
        });

        it('executes activities in sequence', async () => {
            const expectedStepsCallCount: OrchestratorStepsCallCount = {
                callHealthCheckCount: 0,
                callSubmitScanRequest: 0,
                getScanReportCount: 0,
                verifyScanSubmittedCount: 0,
                waitForScanCompletionCount: 0,
                runFunctionalTestsCount: 0,
                logTestRunStartCount: 0,
                waitForScanCompletionNotificationCount: 0,
            };

            const actualStepsCallCount: OrchestratorStepsCallCount = orchestratorStepsStub.orchestratorStepsCallCount;
            const expectedTests: TestGroupName[] = [];

            await testSubject.invoke(contextStub);

            orchestratorIterator.next();
            expectedStepsCallCount.logTestRunStartCount += 1;
            expectedStepsCallCount.callHealthCheckCount += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);

            orchestratorIterator.next();
            expectedStepsCallCount.callSubmitScanRequest += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);

            orchestratorIterator.next();
            expectedStepsCallCount.callSubmitScanRequest += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);

            orchestratorIterator.next();
            expectedTests.push('PostScan', 'ScanStatus');
            expectedStepsCallCount.runFunctionalTestsCount += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);
            expect(orchestratorStepsStub.functionalTestsRun).toEqual(expectedTests);

            orchestratorIterator.next();
            expectedStepsCallCount.verifyScanSubmittedCount += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);

            orchestratorIterator.next();
            expectedStepsCallCount.verifyScanSubmittedCount += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);

            orchestratorIterator.next();
            expectedStepsCallCount.waitForScanCompletionCount += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);

            orchestratorIterator.next();
            expectedStepsCallCount.waitForScanCompletionCount += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);

            orchestratorIterator.next();
            expectedTests.push('ScanPreProcessing', 'ScanQueueing');
            expectedStepsCallCount.runFunctionalTestsCount += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);
            expect(orchestratorStepsStub.functionalTestsRun).toEqual(expectedTests);

            orchestratorIterator.next();
            expectedStepsCallCount.getScanReportCount += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);

            orchestratorIterator.next();
            expectedStepsCallCount.getScanReportCount += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);

            orchestratorIterator.next();
            expectedTests.push('ScanReports');
            expectedStepsCallCount.runFunctionalTestsCount += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);
            expect(orchestratorStepsStub.functionalTestsRun).toEqual(expectedTests);

            orchestratorIterator.next();
            expectedStepsCallCount.waitForScanCompletionNotificationCount += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);

            orchestratorIterator.next();
            expectedStepsCallCount.waitForScanCompletionNotificationCount += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);

            orchestratorIterator.next();
            expectedTests.push('ScanCompletionNotification');
            expectedStepsCallCount.runFunctionalTestsCount += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);
            expect(orchestratorStepsStub.functionalTestsRun).toEqual(expectedTests);

            orchestratorIterator.next();
            expectedTests.push('Finalizer');
            expectedStepsCallCount.runFunctionalTestsCount += 1;
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);
            expect(orchestratorStepsStub.functionalTestsRun).toEqual(expectedTests);

            expect(orchestratorIterator.next().done).toBe(true);
            expect(actualStepsCallCount).toEqual(expectedStepsCallCount);
        });

        test.each([0, 1, 2, 3, 4, 5, 6, 7])('activities throw exception on step %o', async (failedStep) => {
            await testSubject.invoke(contextStub);

            for (let stepNum = 0; stepNum < failedStep; stepNum += 1) {
                orchestratorIterator.next();
            }

            orchestratorStepsStub.shouldThrowException = true;

            expect(() => {
                orchestratorIterator.next();
            }).toThrowError();

            expect(orchestratorIterator.next().done).toBe(true);
        });

        // eslint-disable-next-line jest/no-focused-tests
        it.only('DELETE', () => {
            const generatorMock = Mock.ofType(OrchestrationStepsStub, MockBehavior.Loose, false);
            generatorMock
                .setup((g) => g.invokeHealthCheckRestApi())
                .returns(() => generatorMock.target.invokeHealthCheckRestApi())
                .verifiable();

            const executor = new GeneratorExecutor(generatorMock.object.invokeHealthCheckRestApi());

            executor.runTillEnd();

            generatorMock.verifyAll();
        });
    });

    function setupServiceConfig(): void {
        serviceConfigurationMock
            .setup(async (sc) => sc.getConfigValue('availabilityTestConfig'))
            .returns(async () => availabilityTestConfig);
    }
});
