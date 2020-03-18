// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { BaseTelemetryProperties } from 'logger';
import { IMock, Mock } from 'typemoq';
import { SendNotificationJobManagerEntryPoint } from './send-notification-job-manager-entry-point';

// tslint:disable: no-object-literal-type-assertion

class TestableSendNotificationJobManagerEntryPoint extends SendNotificationJobManagerEntryPoint {
    public invokeGetTelemetryBaseProperties(): BaseTelemetryProperties {
        return this.getTelemetryBaseProperties();
    }
}

describe(SendNotificationJobManagerEntryPoint, () => {
    let testSubject: TestableSendNotificationJobManagerEntryPoint;
    let containerMock: IMock<Container>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);

        testSubject = new TestableSendNotificationJobManagerEntryPoint(containerMock.object);
    });

    describe('getTelemetryBaseProperties', () => {
        it('returns data with source property', () => {
            expect(testSubject.invokeGetTelemetryBaseProperties()).toEqual({
                source: 'webApiSendNotificationJobManager',
            } as BaseTelemetryProperties);
        });
    });
});
