// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AvailabilityTestConfig, ServiceConfiguration } from 'common';
import { TestEnvironment } from 'functional-tests';
import { It, Mock, IMock } from 'typemoq';
import { ActivityOptions, OrchestrationContext } from 'durable-functions';
import { InvocationContextExtraInputs } from '@azure/functions';
import { AppContext } from 'service-library';
import { OrchestrationSteps } from '../orchestration/orchestration-steps';
import { GeneratorExecutor } from '../test-utilities/generator-executor';
import { finalizerTestGroupName } from '../e2e-test-group-names';
import { generatorStub } from '../test-utilities/generator-function';
import { ScanScenarioDriver } from '../e2e-test-scenarios/scan-scenario-driver';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { HealthMonitorOrchestrationController } from './health-monitor-orchestration-controller';
import { TestIdentifier } from './activity-request-data';
import { HealthMonitorActivity } from './health-monitor-activity';

/* eslint-disable @typescript-eslint/no-explicit-any */

class InvocationContextExtraInputsStub implements InvocationContextExtraInputs {
    public readonly values: any = {};

    public get(inputOrName: any): any {
        return this.values[inputOrName];
    }

    public set(inputOrName: any, value: any): void {
        this.values[inputOrName] = value;
    }
}

let testSubject: HealthMonitorOrchestrationController;
let orchestratorIterator: GeneratorExecutor;
let orchestrationContextMock: IMock<OrchestrationContext>;
let invocationContextExtraInputs: InvocationContextExtraInputs;
let scanScenarioDriverMock: IMock<ScanScenarioDriver>;
let orchestrationStepsMock: IMock<OrchestrationSteps>;
let healthMonitorActivityMock: IMock<HealthMonitorActivity>;
let appContext: AppContext;

const allTestIdentifiers: TestIdentifier[] = [{ testGroupName: 'PostScan', scenarioName: 'TestScenario' }];
const availabilityTestConfig: AvailabilityTestConfig = {
    urlToScan: 'some-url',
    scanWaitIntervalInSeconds: 10,
    maxScanWaitTimeInSeconds: 20,
    logQueryTimeRange: 'P1D',
    environmentDefinition: TestEnvironment[TestEnvironment.canary],
    consolidatedIdBase: 'some-report-id',
    scanNotifyApiEndpoint: '/some-endpoint',
    maxScanCompletionNotificationWaitTimeInSeconds: 30,
    scanNotifyFailApiEndpoint: '/some-fail-endpoint',
    maxDeepScanWaitTimeInSeconds: 40,
};
const loggerMock = Mock.ofType(MockableLogger);
const durableClient = {
    startNew: jest.fn().mockImplementation(() => '1'),
};
const activityFn = jest.fn();
const activityOptions = {
    handler: () => {},
};

jest.mock('durable-functions', () => ({
    getClient: () => durableClient,
    app: {
        orchestration: (name: string, handler: any) => {
            handler(orchestrationContextMock);
        },
        activity: (name: string, options: ActivityOptions) => {
            activityFn(name, options);
        },
    },
}));

describe(HealthMonitorOrchestrationController, () => {
    beforeEach(() => {
        scanScenarioDriverMock = Mock.ofType<ScanScenarioDriver>();
        orchestrationStepsMock = Mock.ofType<OrchestrationSteps>();
        orchestrationContextMock = Mock.ofType<OrchestrationContext>();
        healthMonitorActivityMock = Mock.ofType<HealthMonitorActivity>();
        invocationContextExtraInputs = new InvocationContextExtraInputsStub();

        appContext = {
            context: {
                extraInputs: invocationContextExtraInputs,
            },
        } as AppContext;

        const serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
        serviceConfigurationMock
            .setup(async (sc) => sc.getConfigValue('availabilityTestConfig'))
            .returns(async () => availabilityTestConfig);

        orchestrationContextMock.setup((o) => o.extraInputs).returns(() => invocationContextExtraInputs);

        testSubject = new HealthMonitorOrchestrationController(
            healthMonitorActivityMock.object,
            serviceConfigurationMock.object,
            loggerMock.object,
            (_, __) => [scanScenarioDriverMock.object],
            (_, __, ___) => generatorStub(() => null, orchestrationStepsMock.object),
            (_) => allTestIdentifiers,
        );
    });

    it('does not invoke orchestrator executor on construction', () => {
        expect(orchestratorIterator).toBeUndefined();
    });

    describe('invoke', () => {
        it('sets context required for orchestrator execution', async () => {
            await testSubject.invoke(appContext);
            expect((invocationContextExtraInputs as InvocationContextExtraInputsStub).values.controller).toBe(testSubject);
            expect((invocationContextExtraInputs as InvocationContextExtraInputsStub).values.config).toEqual(availabilityTestConfig);
        });

        it('executes activities in sequence', async () => {
            healthMonitorActivityMock.setup((o) => o.handler).returns(() => activityOptions.handler);
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

            await testSubject.invoke(appContext);
            orchestratorIterator = new GeneratorExecutor(testSubject.orchestrationHandler(orchestrationContextMock.object));

            orchestratorIterator.runTillEnd();

            orchestrationStepsMock.verifyAll();
            scanScenarioDriverMock.verifyAll();

            expect(durableClient.startNew).toHaveBeenCalledWith(testSubject.orchestrationFuncName);
            expect(activityFn).toHaveBeenCalledWith(HealthMonitorActivity.name, { handler: activityOptions.handler });
        });
    });
});
