// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger, Logger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { SendNotificationJobManagerEntryPoint } from './send-notification-job-manager-entry-point';
import { SendNotificationTaskCreator } from './task/send-notification-task-creator';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

class TestableSendNotificationJobManagerEntryPoint extends SendNotificationJobManagerEntryPoint {
    public invokeGetTelemetryBaseProperties(): BaseTelemetryProperties {
        return this.getTelemetryBaseProperties();
    }

    public async runCustomAction(container: Container): Promise<void> {
        return super.runCustomAction(container);
    }
}

describe(SendNotificationJobManagerEntryPoint, () => {
    let testSubject: TestableSendNotificationJobManagerEntryPoint;
    let containerMock: IMock<Container>;
    let sendNotificationTaskCreatorMock: IMock<SendNotificationTaskCreator>;
    let loggerMock: IMock<Logger>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        sendNotificationTaskCreatorMock = Mock.ofType(SendNotificationTaskCreator);
        loggerMock = Mock.ofType(ContextAwareLogger);

        testSubject = new TestableSendNotificationJobManagerEntryPoint(containerMock.object);
    });

    describe('getTelemetryBaseProperties', () => {
        it('returns data with source property', () => {
            expect(testSubject.invokeGetTelemetryBaseProperties()).toEqual({
                source: 'webApiSendNotificationJobManager',
            } as BaseTelemetryProperties);
        });
    });

    describe('runCustomAction', () => {
        beforeEach(() => {
            containerMock.setup((c) => c.get(SendNotificationTaskCreator)).returns(() => sendNotificationTaskCreatorMock.object);
            containerMock.setup((c) => c.get(ContextAwareLogger)).returns(() => loggerMock.object);
        });

        it('invokes worker', async () => {
            loggerMock
                .setup(async (l) => l.setup())
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            sendNotificationTaskCreatorMock
                .setup(async (w) => w.init())
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            sendNotificationTaskCreatorMock
                .setup(async (w) => w.run())
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            await testSubject.runCustomAction(containerMock.object);
        });
    });

    afterEach(() => {
        containerMock.verifyAll();
        sendNotificationTaskCreatorMock.verifyAll();
        loggerMock.verifyAll();
    });
});
