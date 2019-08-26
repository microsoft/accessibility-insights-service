// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { BaseTelemetryProperties } from 'logger';
import { IMock, Mock } from 'typemoq';
import { WebApiScanJobManagerEntryPoint } from './web-api-scan-job-manager-entry-point';

// tslint:disable: no-object-literal-type-assertion

class TestableWebApiScanJobManagerEntryPoint extends WebApiScanJobManagerEntryPoint {
    public invokeGetTelemetryBaseProperties(): BaseTelemetryProperties {
        return this.getTelemetryBaseProperties();
    }
}

describe(WebApiScanJobManagerEntryPoint, () => {
    let testSubject: TestableWebApiScanJobManagerEntryPoint;
    let containerMock: IMock<Container>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);

        testSubject = new TestableWebApiScanJobManagerEntryPoint(containerMock.object);
    });

    describe('getTelemetryBaseProperties', () => {
        it('returns data with source property', () => {
            expect(testSubject.invokeGetTelemetryBaseProperties()).toEqual({
                source: 'webApiScanJobManager',
            } as BaseTelemetryProperties);
        });
    });
});
