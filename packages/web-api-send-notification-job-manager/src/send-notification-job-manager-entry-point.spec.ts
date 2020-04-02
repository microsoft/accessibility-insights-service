// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { BaseTelemetryProperties } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { SendNotificationJobManagerEntryPoint } from './send-notification-job-manager-entry-point';
import { SendNotificationTaskCreator } from './task/send-notification-task-creator';

// tslint:disable: no-object-literal-type-assertion

class TestableSendNotificationJobManagerEntryPoint extends SendNotificationJobManagerEntryPoint {
    public invokeGetTelemetryBaseProperties(): BaseTelemetryProperties {
        return this.getTelemetryBaseProperties();
    }

    // tslint:disable-next-line: no-unnecessary-override
    public async runCustomAction(container: Container): Promise<void> {
        return super.runCustomAction(container);
    }
}

describe(SendNotificationJobManagerEntryPoint, () => {
    let testSubject: TestableSendNotificationJobManagerEntryPoint;
    let containerMock: IMock<Container>;
    let sendNotificationTaskCreatorMock: IMock<SendNotificationTaskCreator>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        sendNotificationTaskCreatorMock = Mock.ofType(SendNotificationTaskCreator);

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
        });

        it('invokes worker', async () => {
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
    });
});
