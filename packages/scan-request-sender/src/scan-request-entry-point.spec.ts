// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { BaseTelemetryProperties } from 'logger';
import { IMock, Mock } from 'typemoq';
import { ScanRequestEntryPoint } from './scan-request-entry-point';

// tslint:disable: no-object-literal-type-assertion

class TestJobManagerEntryPoint extends ScanRequestEntryPoint {
    public invokeGetTelemetryBaseProperties(): BaseTelemetryProperties {
        return this.getTelemetryBaseProperties();
    }
}

describe(ScanRequestEntryPoint, () => {
    let testSubject: TestJobManagerEntryPoint;
    let containerMock: IMock<Container>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);

        testSubject = new TestJobManagerEntryPoint(containerMock.object);
    });

    describe('getTelemetryBaseProperties', () => {
        it('returns data with source property', () => {
            expect(testSubject.invokeGetTelemetryBaseProperties()).toEqual({ source: 'scanRequestSender' } as BaseTelemetryProperties);
        });
    });
});
