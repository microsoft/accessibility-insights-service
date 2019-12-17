// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { TelemetryClient } from 'applicationinsights';
import { IMock, Mock, Times } from 'typemoq';
import { AppInsightsLoggerClient } from './app-insights-logger-client';
import { ContextAwareAppInsightsLoggerClient } from './context-aware-app-insights-logger-client';

export class TestableContextAwareAppInsightsLoggerClient extends ContextAwareAppInsightsLoggerClient {
    public getTelemetryClient(): TelemetryClient {
        return this.telemetryClient;
    }

    // tslint:disable-next-line: no-unnecessary-override
    public getAdditionalPropertiesToAddToEvent(): { [key: string]: string } {
        return super.getAdditionalPropertiesToAddToEvent();
    }
}

describe(ContextAwareAppInsightsLoggerClient, () => {
    let testSubject: TestableContextAwareAppInsightsLoggerClient;
    let rootLoggerClient: IMock<AppInsightsLoggerClient>;

    beforeEach(() => {
        rootLoggerClient = Mock.ofType(AppInsightsLoggerClient);
        testSubject = new TestableContextAwareAppInsightsLoggerClient(rootLoggerClient.object);
        process.env.APPINSIGHTS_INSTRUMENTATIONKEY = '00000000-0000-0000-0000-000000000000';
    });

    afterEach(() => {
        delete process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
    });

    it('should not create telemetry client without calling setup', async () => {
        expect(testSubject.getTelemetryClient()).toBeUndefined();
    });

    describe('setup', () => {
        let rootLoggerSetup: boolean;

        beforeEach(() => {
            rootLoggerSetup = false;
            rootLoggerClient.setup(r => r.setup()).callback(() => (rootLoggerSetup = true));
            rootLoggerClient.setup(r => r.isInitialized()).returns(() => rootLoggerSetup);
        });

        it('should create telemetry client with base properties', async () => {
            await testSubject.setup({ source: 'foo' });

            expect(testSubject.getTelemetryClient().commonProperties).toEqual({ source: 'foo' });
        });

        it('isInitialized returns correct values', async () => {
            expect(testSubject.isInitialized()).toBe(false);

            await testSubject.setup({});

            expect(testSubject.isInitialized()).toBe(true);
        });

        it('should only initialize rootLoggerClient once', async () => {
            const siblingTestSubject = new TestableContextAwareAppInsightsLoggerClient(rootLoggerClient.object);

            rootLoggerClient
                .setup(r => r.setup())
                .callback(() => (rootLoggerSetup = true))
                .verifiable(Times.once());

            await testSubject.setup({});
            await siblingTestSubject.setup({});

            rootLoggerClient.verifyAll();
        });

        it('isInitialized works as expected with shared rootLoggerClient', async () => {
            const siblingTestSubject = new TestableContextAwareAppInsightsLoggerClient(rootLoggerClient.object);

            await testSubject.setup({});

            expect(testSubject.isInitialized()).toBe(true);
            expect(siblingTestSubject.isInitialized()).toBe(false);
        });
    });

    describe('getAdditionalPropertiesToAddToEvent', () => {
        it('should return properties from root logger', () => {
            const rootLoggerProps = {
                rootProps: 'rootPropValue',
            };

            rootLoggerClient.setup(r => r.getDefaultProperties()).returns(() => rootLoggerProps);

            expect(testSubject.getAdditionalPropertiesToAddToEvent()).toEqual(rootLoggerProps);
        });
    });
});
