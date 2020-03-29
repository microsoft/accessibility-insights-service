// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger, Logger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { WebApiScanJobManagerEntryPoint } from './web-api-scan-job-manager-entry-point';
import { Worker } from './worker/worker';
// tslint:disable: no-object-literal-type-assertion

class TestableWebApiScanJobManagerEntryPoint extends WebApiScanJobManagerEntryPoint {
    public invokeGetTelemetryBaseProperties(): BaseTelemetryProperties {
        return this.getTelemetryBaseProperties();
    }

    // tslint:disable-next-line: no-unnecessary-override
    public async runCustomAction(container: Container): Promise<void> {
        return super.runCustomAction(container);
    }
}

describe(WebApiScanJobManagerEntryPoint, () => {
    let testSubject: TestableWebApiScanJobManagerEntryPoint;
    let containerMock: IMock<Container>;
    let workerMock: IMock<Worker>;
    let loggerMock: IMock<Logger>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        workerMock = Mock.ofType(Worker);
        loggerMock = Mock.ofType(ContextAwareLogger);

        testSubject = new TestableWebApiScanJobManagerEntryPoint(containerMock.object);
    });

    describe('getTelemetryBaseProperties', () => {
        it('returns data with source property', () => {
            expect(testSubject.invokeGetTelemetryBaseProperties()).toEqual({
                source: 'webApiScanJobManager',
            } as BaseTelemetryProperties);
        });
    });

    describe('runCustomAction', () => {
        beforeEach(() => {
            containerMock.setup(c => c.get(Worker)).returns(() => workerMock.object);
            containerMock.setup(c => c.get(ContextAwareLogger)).returns(() => loggerMock.object);
        });

        it('invokes worker', async () => {
            loggerMock
                .setup(async l => l.setup())
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            workerMock
                .setup(async w => w.init())
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            workerMock
                .setup(async w => w.run())
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            await testSubject.runCustomAction(containerMock.object);
        });
    });

    afterEach(() => {
        containerMock.verifyAll();
        workerMock.verifyAll();
        loggerMock.verifyAll();
    });
});
