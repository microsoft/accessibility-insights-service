// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { BaseTelemetryProperties } from 'logger';
import { IMock, Mock } from 'typemoq';
import { WebApiScanRunnerEntryPoint } from './web-api-scan-runner-entry-point';

// tslint:disable: no-object-literal-type-assertion

class TestableWebApiScanRunnerEntryPoint extends WebApiScanRunnerEntryPoint {
    public invokeGetTelemetryBaseProperties(): BaseTelemetryProperties {
        return this.getTelemetryBaseProperties();
    }
}

describe(WebApiScanRunnerEntryPoint, () => {
    let testSubject: TestableWebApiScanRunnerEntryPoint;
    let containerMock: IMock<Container>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);

        testSubject = new TestableWebApiScanRunnerEntryPoint(containerMock.object);
    });

    describe('getTelemetryBaseProperties', () => {
        it('returns data with source property', () => {
            expect(testSubject.invokeGetTelemetryBaseProperties()).toEqual({
                source: 'webApiScanRunner',
            } as BaseTelemetryProperties);
        });
    });
});
