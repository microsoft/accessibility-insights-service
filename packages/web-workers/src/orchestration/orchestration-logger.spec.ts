// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Logger, LogLevel } from 'logger';
import { Mock } from 'typemoq';
import { IMock } from 'typemoq/Api/IMock';
import * as df from 'durable-functions';
import { OrchestrationLogger } from './orchestration-logger';

describe(OrchestrationLogger, () => {
    let loggerMock: IMock<Logger>;
    let context: df.OrchestrationContext;
    const orchestrationContext = {
        currentUtcDateTime: new Date(0, 1, 2, 3),
        instanceId: 'instanceId',
        isReplaying: true,
    } as df.DurableOrchestrationContext;

    let testSubject: OrchestrationLogger;

    beforeEach(() => {
        loggerMock = Mock.ofType<Logger>();
        context = <df.OrchestrationContext>(<unknown>{
            df: orchestrationContext,
        });

        testSubject = new OrchestrationLogger(context, loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
    });

    it('logs with expected properties', () => {
        const expectedProperties = {
            instanceId: orchestrationContext.instanceId,
            isReplaying: orchestrationContext.isReplaying.toString(),
            currentUtcDateTime: orchestrationContext.currentUtcDateTime.toUTCString(),
        };
        const message = 'log message';
        loggerMock.setup((l) => l.log(message, LogLevel.Info, expectedProperties)).verifiable();

        testSubject.logOrchestrationStep(message);
    });

    it('logs with custom properties and log level', () => {
        const customProperties = {
            activityName: 'activity name',
        };
        const expectedProperties = {
            instanceId: orchestrationContext.instanceId,
            isReplaying: orchestrationContext.isReplaying.toString(),
            currentUtcDateTime: orchestrationContext.currentUtcDateTime.toUTCString(),
            activityName: customProperties.activityName,
        };
        const message = 'log message';
        loggerMock.setup((l) => l.log(message, LogLevel.Error, expectedProperties)).verifiable();

        testSubject.logOrchestrationStep(message, LogLevel.Error, expectedProperties);
    });
});
