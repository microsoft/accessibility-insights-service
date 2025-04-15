// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Container } from 'inversify';
import { BaseTelemetryProperties, GlobalLogger, Logger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { PrivacyScanJobManagerEntryPoint } from './privacy-scan-job-manager-entry-point';
import { Worker } from './worker/worker';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

class PrivacyScanJobManagerEntryPointWrapper extends PrivacyScanJobManagerEntryPoint {
    public invokeGetTelemetryBaseProperties(): BaseTelemetryProperties {
        return this.getTelemetryBaseProperties();
    }

    public async runCustomAction(container: Container): Promise<void> {
        return super.runCustomAction(container);
    }
}

describe(PrivacyScanJobManagerEntryPoint, () => {
    let testSubject: PrivacyScanJobManagerEntryPointWrapper;
    let containerMock: IMock<Container>;
    let workerMock: IMock<Worker>;
    let loggerMock: IMock<Logger>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        workerMock = Mock.ofType(Worker);
        loggerMock = Mock.ofType(GlobalLogger);

        testSubject = new PrivacyScanJobManagerEntryPointWrapper(containerMock.object);
    });

    describe('getTelemetryBaseProperties', () => {
        it('returns data with source property', () => {
            expect(testSubject.invokeGetTelemetryBaseProperties()).toEqual({
                source: 'privacyScanJobManager',
            } as BaseTelemetryProperties);
        });
    });

    describe('runCustomAction', () => {
        beforeEach(() => {
            containerMock.setup((c) => c.get(Worker)).returns(() => workerMock.object);
            containerMock.setup((c) => c.get(GlobalLogger)).returns(() => loggerMock.object);
        });

        it('invokes worker', async () => {
            loggerMock
                .setup(async (l) => l.setup())
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            workerMock
                .setup(async (w) => w.init())
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            workerMock
                .setup(async (w) => w.run())
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
