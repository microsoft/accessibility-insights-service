// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { BaseTelemetryProperties } from 'logger';
import { IMock, Mock } from 'typemoq';
import { WebApiScanRequestSenderEntryPoint } from './web-api-scan-request-sender-entry-point';

// tslint:disable: no-object-literal-type-assertion

class TestableWebApiScanRequestSenderEntryPoint extends WebApiScanRequestSenderEntryPoint {
    public invokeGetTelemetryBaseProperties(): BaseTelemetryProperties {
        return this.getTelemetryBaseProperties();
    }
}

describe(WebApiScanRequestSenderEntryPoint, () => {
    let testSubject: TestableWebApiScanRequestSenderEntryPoint;
    let containerMock: IMock<Container>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);

        testSubject = new TestableWebApiScanRequestSenderEntryPoint(containerMock.object);
    });

    describe('getTelemetryBaseProperties', () => {
        it('returns data with source property', () => {
            expect(testSubject.invokeGetTelemetryBaseProperties()).toEqual({
                source: 'webApiScanRequestSender',
            } as BaseTelemetryProperties);
        });
    });
});
