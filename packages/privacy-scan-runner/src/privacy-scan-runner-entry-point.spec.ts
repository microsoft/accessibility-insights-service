// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger, Logger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { Runner } from './runner/runner';
import { PrivacyScanRunnerEntryPoint } from './privacy-scan-runner-entry-point';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

describe(PrivacyScanRunnerEntryPoint, () => {
    class TestPrivacyScanRunnerEntryPoint extends PrivacyScanRunnerEntryPoint {
        public async invokeRunCustomAction(container: Container): Promise<void> {
            await this.runCustomAction(container);
        }

        public invokeGetTelemetryBaseProperties(): BaseTelemetryProperties {
            return this.getTelemetryBaseProperties();
        }
    }

    let testSubject: TestPrivacyScanRunnerEntryPoint;
    let containerMock: IMock<Container>;
    let runnerMock: IMock<Runner>;
    let loggerMock: IMock<Logger>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        runnerMock = Mock.ofType(Runner);
        loggerMock = Mock.ofType(ContextAwareLogger);

        testSubject = new TestPrivacyScanRunnerEntryPoint(containerMock.object);

        containerMock.setup((c) => c.get(Runner)).returns(() => runnerMock.object);
        containerMock.setup((c) => c.get(ContextAwareLogger)).returns(() => loggerMock.object);
    });

    it('invokes runner.run', async () => {
        loggerMock
            .setup(async (l) => l.setup())
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());

        runnerMock
            .setup(async (r) => r.run())
            .returns(async () => Promise.resolve())
            .verifiable();

        await expect(testSubject.invokeRunCustomAction(containerMock.object)).resolves.toBeUndefined();
    });

    describe('getTelemetryBaseProperties', () => {
        it('returns data with source property', () => {
            expect(testSubject.invokeGetTelemetryBaseProperties()).toEqual({ source: 'privacyScanRunner' } as BaseTelemetryProperties);
        });
    });

    afterEach(() => {
        loggerMock.verifyAll();
        runnerMock.verifyAll();
        containerMock.verifyAll();
    });
});
