// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AvailabilityTestConfig } from 'common';
// eslint-disable-next-line import/no-internal-modules
import { IOrchestrationFunctionContext } from 'durable-functions/lib/src/classes';
import { Logger } from 'logger';
import { IMock, Mock } from 'typemoq';
import { ActivityAction } from '../contracts/activity-actions';
import { WebApiConfig } from '../controllers/web-api-config';
import { generatorStub } from '../test-utilities/generator-function';
import { GeneratorExecutor } from '../test-utilities/generator-executor';
import { ActivityActionDispatcher } from './activity-action-dispatcher';
import { OrchestrationSteps } from './orchestration-steps';
import { createOrchestrationSteps } from './orchestration-steps-factory';

describe(createOrchestrationSteps, () => {
    const webApiConfig: WebApiConfig = {
        releaseId: 'release id',
        baseUrl: 'base url',
    };
    const availabilityTestConfig = {} as AvailabilityTestConfig;
    let activityActionDispatcherMock: IMock<ActivityActionDispatcher>;
    let loggerMock: IMock<Logger>;
    const contextStub = {} as IOrchestrationFunctionContext;
    const createActivityActionDispatcherStub = () => activityActionDispatcherMock.object;

    beforeEach(() => {
        activityActionDispatcherMock = Mock.ofType<ActivityActionDispatcher>();
        loggerMock = Mock.ofType<Logger>();
    });

    it('calls getWebApiConfig activity action', () => {
        activityActionDispatcherMock
            .setup((a) => a.callActivity(ActivityAction.getWebApiConfig))
            .returns(() => generatorStub(() => null, webApiConfig))
            .verifiable();

        const generatorExecutor = new GeneratorExecutor(
            createOrchestrationSteps(contextStub, availabilityTestConfig, loggerMock.object, createActivityActionDispatcherStub),
        );
        const orchestrationSteps = generatorExecutor.runTillEnd();

        expect(orchestrationSteps).toBeInstanceOf(OrchestrationSteps);
        activityActionDispatcherMock.verifyAll();
    });
});
