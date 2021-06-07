// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { OnDemandDispatcher } from './sender/on-demand-dispatcher';
import { WebApiScanRequestSenderEntryPoint } from './web-api-scan-request-sender-entry-point';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

class TestableWebApiScanRequestSenderEntryPoint extends WebApiScanRequestSenderEntryPoint {
    public invokeGetTelemetryBaseProperties(): BaseTelemetryProperties {
        return this.getTelemetryBaseProperties();
    }

    public async runCustomAction(container: Container): Promise<void> {
        return super.runCustomAction(container);
    }
}

describe(WebApiScanRequestSenderEntryPoint, () => {
    let testSubject: TestableWebApiScanRequestSenderEntryPoint;
    let containerMock: IMock<Container>;
    let loggerMock: IMock<ContextAwareLogger>;
    let onDispatcherMock: IMock<OnDemandDispatcher>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        loggerMock = Mock.ofType(ContextAwareLogger);
        onDispatcherMock = Mock.ofType(OnDemandDispatcher);

        containerMock.setup((c) => c.get(ContextAwareLogger)).returns(() => loggerMock.object);
        containerMock.setup((c) => c.get(OnDemandDispatcher)).returns(() => onDispatcherMock.object);

        testSubject = new TestableWebApiScanRequestSenderEntryPoint(containerMock.object);
    });

    describe('getTelemetryBaseProperties', () => {
        it('returns data with source property', () => {
            expect(testSubject.invokeGetTelemetryBaseProperties()).toEqual({
                source: 'webApiScanRequestSender',
            } as BaseTelemetryProperties);
        });
    });

    describe('runCustomAction', () => {
        it('dispatches scan requests', async () => {
            loggerMock
                .setup(async (l) => l.setup())
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            onDispatcherMock
                .setup(async (d) => d.dispatchScanRequests())
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            await testSubject.runCustomAction(containerMock.object);
        });
    });

    afterEach(() => {
        loggerMock.verifyAll();
        containerMock.verifyAll();
        onDispatcherMock.verifyAll();
    });
});
