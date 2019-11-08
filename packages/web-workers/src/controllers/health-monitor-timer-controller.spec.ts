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
        testSubject.context = context;
    });

    it('handles request', async () => {
        const funcTimer: FunctionTimer = { IsPastDue: false };
        const expectedBindings = [
            {
                FunctionName: 'health-monitor-orchestration-func',
                InstanceId: orchestrationInstanceId,
            },
        ];
        await testSubject.handleRequest(funcTimer);
        expect(context.bindings.orchestrationFunc).toEqual(expectedBindings);
    });

    it('warns if timer past due', async () => {
        const funcTimer: FunctionTimer = { IsPastDue: true };
        // tslint:disable-next-line: no-unsafe-any
        contextAwareLoggerMock.setup(l => l.logWarn(It.isAny())).verifiable(Times.once());
        await testSubject.invoke(context, funcTimer);
        contextAwareLoggerMock.verifyAll();
    });
});
