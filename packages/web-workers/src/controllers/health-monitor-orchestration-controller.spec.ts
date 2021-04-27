// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AvailabilityTestConfig, ServiceConfiguration } from 'common';
import * as durableFunctions from 'durable-functions';
// eslint-disable-next-line import/no-internal-modules
import { IOrchestrationFunctionContext } from 'durable-functions/lib/src/classes';
import { TestEnvironment } from 'functional-tests';
import { It, Mock } from 'typemoq';
import { OrchestrationSteps } from '../orchestration/orchestration-steps';
import { GeneratorExecutor } from '../test-utilities/generator-executor';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { finalizerTestGroupName } from '../e2e-test-group-names';
import { generatorStub } from '../test-utilities/generator-function';
import { ScanScenarioDriver } from '../e2e-test-scenarios/scan-scenario-driver';
import { HealthMonitorOrchestrationController } from './health-monitor-orchestration-controller';
import { TestIdentifier } from './activity-request-data';

describe('HealthMonitorOrchestrationController', () => {
    let testSubject: HealthMonitorOrchestrationController;
    let orchestratorIterator: GeneratorExecutor;

    const scanScenarioDriverMock = Mock.ofType<ScanScenarioDriver>();
    const orchestrationStepsMock = Mock.ofType<OrchestrationSteps>();
    const loggerMock = Mock.ofType(MockableLogger);
    const allTestIdentifiers: TestIdentifier[] = [{ testGroupName: 'PostScan', scenarioName: 'TestScenario' }];

    const availabilityTestConfig: AvailabilityTestConfig = {
        urlToScan: 'some-url',
        scanWaitIntervalInSeconds: 10,
        maxScanWaitTimeInSeconds: 20,
        logQueryTimeRange: 'P1D',
        environmentDefinition: TestEnvironment[TestEnvironment.canary],
        consolidatedIdBase: 'somereportid',
        scanNotifyApiEndpoint: '/some-endpoint',
        maxScanCompletionNotificationWaitTimeInSeconds: 30,
        scanNotifyFailApiEndpoint: '/some-fail-endpoint',
        maxDeepScanWaitTimeInSeconds: 40,
    };
    const contextStub = ({
        bindingData: {},
        executionContext: {
            functionName: 'function-name',
            invocationId: 'id',
        },
    } as unknown) as IOrchestrationFunctionContext;

    beforeEach(() => {
        contextStub.bindingData = {};

        const serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
        serviceConfigurationMock
            .setup(async (sc) => sc.getConfigValue('availabilityTestConfig'))
            .returns(async () => availabilityTestConfig);

        const df = Mock.ofType<typeof durableFunctions>(undefined);
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const orchestratorGeneratorMock = Mock.ofInstance<(contextObj: IOrchestrationFunctionContext) => void>(() => {});
        df.setup((d) => d.orchestrator(It.isAny()))
            .callback((fn: (context: IOrchestrationFunctionContext) => IterableIterator<unknown>) => {
                orchestratorIterator = new GeneratorExecutor(fn(contextStub));
            })
            .returns(() => orchestratorGeneratorMock.object);

        testSubject = new HealthMonitorOrchestrationController(
            serviceConfigurationMock.object,
            loggerMock.object,
            {
                baseUrl: 'some-url',
            },
            df.object,
            (_, __, ___) => [scanScenarioDriverMock.object],
            (_, __, ___) => orchestrationStepsMock.object,
            (_) => allTestIdentifiers,
        );
    });

    it('does not invoke orchestrator executor on construction', () => {
        expect(orchestratorIterator).toBeUndefined();
    });

    describe('invoke', () => {
        it('sets context required for orchestrator execution', async () => {
            await testSubject.invoke(contextStub);
            expect(contextStub.bindingData.controller).toBe(testSubject);
            expect(contextStub.bindingData.availabilityTestConfig).toEqual(availabilityTestConfig);
        });

        it('executes activities in sequence', async () => {
            await testSubject.invoke(contextStub);

            orchestrationStepsMock
                .setup((m) => m.logTestRunStart(allTestIdentifiers))
                .returns((_) => generatorStub())
                .verifiable();
            orchestrationStepsMock
                .setup((m) => m.invokeHealthCheckRestApi())
                .returns((_) => generatorStub())
                .verifiable();
            orchestrationStepsMock
                .setup((m) => m.runFunctionalTestGroups(It.isAny(), It.isAny(), [finalizerTestGroupName]))
                .returns((_) => generatorStub())
                .verifiable();

            scanScenarioDriverMock
                .setup((m) => m.submitScanPhase())
                .returns((_) => generatorStub())
                .verifiable();
            scanScenarioDriverMock
                .setup((m) => m.waitForScanCompletionPhase())
                .returns((_) => generatorStub())
                .verifiable();
            scanScenarioDriverMock
                .setup((m) => m.afterScanCompletedPhase())
                .returns((_) => generatorStub())
                .verifiable();

            orchestratorIterator.runTillEnd();

            orchestrationStepsMock.verifyAll();
            scanScenarioDriverMock.verifyAll();
        });
    });
});
