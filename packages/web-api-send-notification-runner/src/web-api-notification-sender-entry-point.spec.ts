// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger, Logger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { NotificationSender } from './sender/notification-sender';
import { WebApiNotificationSenderEntryPoint } from './web-api-notification-sender-entry-point';

// tslint:disable: no-object-literal-type-assertion

describe(WebApiNotificationSenderEntryPoint, () => {
    class TestWebApiSendNotificationRunnerEntryPoint extends WebApiNotificationSenderEntryPoint {
        public async invokeRunCustomAction(container: Container): Promise<void> {
            await this.runCustomAction(container);
        }

        public invokeGetTelemetryBaseProperties(): BaseTelemetryProperties {
            return this.getTelemetryBaseProperties();
        }
    }

    let testSubject: TestWebApiSendNotificationRunnerEntryPoint;
    let containerMock: IMock<Container>;
    let senderMock: IMock<NotificationSender>;
    let loggerMock: IMock<Logger>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        senderMock = Mock.ofType(NotificationSender);
        loggerMock = Mock.ofType(ContextAwareLogger);

        testSubject = new TestWebApiSendNotificationRunnerEntryPoint(containerMock.object);

        containerMock.setup((c) => c.get(NotificationSender)).returns(() => senderMock.object);
        containerMock.setup((c) => c.get(ContextAwareLogger)).returns(() => loggerMock.object);
    });

    it('invokes sender.sendNotification', async () => {
        loggerMock
            .setup(async (l) => l.setup())
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());

        senderMock
            .setup(async (r) => r.sendNotification())
            .returns(async () => Promise.resolve())
            .verifiable();

        await expect(testSubject.invokeRunCustomAction(containerMock.object)).resolves.toBeUndefined();
    });

    describe('getTelemetryBaseProperties', () => {
        it('returns data with source property', () => {
            expect(testSubject.invokeGetTelemetryBaseProperties()).toEqual({
                source: 'webApiNotificationSender',
            } as BaseTelemetryProperties);
        });
    });

    afterEach(() => {
        containerMock.verifyAll();
        loggerMock.verifyAll();
        senderMock.verifyAll();
    });
});
