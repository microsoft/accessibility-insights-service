// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { GuidGenerator, ServiceConfiguration } from 'common';
import { IMock, It, Mock, Times } from 'typemoq';
import { FunctionTimer } from '../contracts/function-timer';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { HealthMonitorTimerController } from './health-monitor-timer-controller';

let testSubject: HealthMonitorTimerController;
let serviceConfigurationMock: IMock<ServiceConfiguration>;
let loggerMock: IMock<MockableLogger>;
let context: Context;
let guidGeneratorMock: IMock<GuidGenerator>;
const orchestrationInstanceId = 'instance-id';

// tslint:disable: no-unsafe-any
describe('HealthMonitorTimerController', () => {
    beforeEach(() => {
        serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
        loggerMock = Mock.ofType(MockableLogger);
        guidGeneratorMock = Mock.ofType(GuidGenerator);
        guidGeneratorMock.setup(g => g.createGuid()).returns(() => orchestrationInstanceId);

        context = <Context>(<unknown>{
            bindingDefinitions: {},
            executionContext: {
                functionName: 'function-name',
                invocationId: 'id',
            },
            bindings: { orchestrationFunc: undefined },
        });

        testSubject = new HealthMonitorTimerController(serviceConfigurationMock.object, loggerMock.object, guidGeneratorMock.object);
    });

    describe('invoke', () => {
        it('handles request', async () => {
            const funcTimer: FunctionTimer = { IsPastDue: false };
            const expectedBindings = [
                {
                    FunctionName: 'health-monitor-orchestration-func',
                    InstanceId: orchestrationInstanceId,
                },
            ];
            await testSubject.invoke(context, funcTimer);
            expect(context.bindings.orchestrationFunc).toEqual(expectedBindings);
        });

        it('warns if timer past due', async () => {
            const funcTimer: FunctionTimer = { IsPastDue: true };
            await testSubject.invoke(context, funcTimer);
            loggerMock.verify(l => l.logWarn(It.isAny()), Times.once());
        });

        it('does not warns if timer not past due', async () => {
            const funcTimer: FunctionTimer = { IsPastDue: false };
            await testSubject.invoke(context, funcTimer);

            loggerMock.verify(l => l.logWarn(It.isAny()), Times.never());
        });
    });
});
