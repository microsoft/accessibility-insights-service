// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { GuidGenerator, ServiceConfiguration } from 'common';
import { ContextAwareLogger } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { FunctionTimer } from '../contracts/function-timer';
import { HealthMonitorTimerController } from './health-monitor-timer-controller';

let testSubject: HealthMonitorTimerController;
let serviceConfigurationMock: IMock<ServiceConfiguration>;
let contextAwareLoggerMock: IMock<ContextAwareLogger>;
let context: Context;
let guidGeneratorMock: IMock<GuidGenerator>;
const orchestrationInstanceId = 'instance-id';

// tslint:disable: no-unsafe-any
describe('HealthMonitorTimerController', () => {
    beforeEach(() => {
        serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
        contextAwareLoggerMock = Mock.ofType(ContextAwareLogger);
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

        testSubject = new HealthMonitorTimerController(
            serviceConfigurationMock.object,
            contextAwareLoggerMock.object,
            guidGeneratorMock.object,
        );
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
            contextAwareLoggerMock.verify(l => l.logWarn(It.isAny()), Times.once());
        });

        it('does not warns if timer not past due', async () => {
            const funcTimer: FunctionTimer = { IsPastDue: false };
            await testSubject.invoke(context, funcTimer);

            contextAwareLoggerMock.verify(l => l.logWarn(It.isAny()), Times.never());
        });
    });
});
