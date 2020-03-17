// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { BaseTelemetryProperties } from 'logger';
import { IMock, Mock } from 'typemoq';
import { NotificationSender } from './sender/notification-sender';
import { WebApiSendNotificationRunnerEntryPoint } from './web-api-send-notification-runner-entry-point';

// tslint:disable: no-object-literal-type-assertion

describe(WebApiSendNotificationRunnerEntryPoint, () => {
    class TestWebApiSendNotificationRunnerEntryPoint extends WebApiSendNotificationRunnerEntryPoint {
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

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        senderMock = Mock.ofType(NotificationSender);

        testSubject = new TestWebApiSendNotificationRunnerEntryPoint(containerMock.object);

        containerMock.setup(c => c.get(NotificationSender)).returns(() => senderMock.object);
    });

    it('invokes sender.sendNotification', async () => {
        senderMock
            .setup(async r => r.sendNotification())
            .returns(async () => Promise.resolve())
            .verifiable();

        await expect(testSubject.invokeRunCustomAction(containerMock.object)).resolves.toBeUndefined();

        senderMock.verifyAll();
    });

    describe('getTelemetryBaseProperties', () => {
        it('returns data with source property', () => {
            expect(testSubject.invokeGetTelemetryBaseProperties()).toEqual({
                source: 'webApiSendNotificationRunner',
            } as BaseTelemetryProperties);
        });
    });
});
