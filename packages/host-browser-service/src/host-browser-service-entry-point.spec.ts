// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { BaseTelemetryProperties, GlobalLogger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { HostBrowserServiceEntryPoint } from './host-browser-service-entry-point';
import { BrowserServer } from './browser-server';

class TestableHostBrowserServiceEntryPoint extends HostBrowserServiceEntryPoint {
    public invokeGetTelemetryBaseProperties(): BaseTelemetryProperties {
        return this.getTelemetryBaseProperties();
    }

    public async runCustomAction(container: Container): Promise<void> {
        return super.runCustomAction(container);
    }
}

describe(TestableHostBrowserServiceEntryPoint, () => {
    let testSubject: TestableHostBrowserServiceEntryPoint;
    let containerMock: IMock<Container>;
    let loggerMock: IMock<GlobalLogger>;
    let browserServerMock: IMock<BrowserServer>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        loggerMock = Mock.ofType(GlobalLogger);
        browserServerMock = Mock.ofType(BrowserServer);

        containerMock.setup((c) => c.get(GlobalLogger)).returns(() => loggerMock.object);
        containerMock.setup((c) => c.get(BrowserServer)).returns(() => browserServerMock.object);

        testSubject = new TestableHostBrowserServiceEntryPoint(containerMock.object);
    });

    describe('getTelemetryBaseProperties', () => {
        it('returns data with source property', () => {
            expect(testSubject.invokeGetTelemetryBaseProperties()).toEqual({
                source: 'hostBrowserService',
            } as BaseTelemetryProperties);
        });
    });

    describe('runCustomAction', () => {
        it('starts browser server', async () => {
            loggerMock
                .setup(async (l) => l.setup())
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            browserServerMock
                .setup(async (m) => m.run())
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            await testSubject.runCustomAction(containerMock.object);
        });
    });

    afterEach(() => {
        loggerMock.verifyAll();
        containerMock.verifyAll();
        browserServerMock.verifyAll();
    });
});
