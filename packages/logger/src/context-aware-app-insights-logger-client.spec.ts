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
}

describe(ContextAwareAppInsightsLoggerClient, () => {
    let testSubject: TestableContextAwareAppInsightsLoggerClient;
    let globalLoggerClient: IMock<AppInsightsLoggerClient>;

    beforeEach(() => {
        globalLoggerClient = Mock.ofType(AppInsightsLoggerClient);
        testSubject = new TestableContextAwareAppInsightsLoggerClient(globalLoggerClient.object);
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
            globalLoggerClient.setup((r) => r.setup()).callback(() => (rootLoggerSetup = true));
            globalLoggerClient.setup((r) => r.isInitialized()).returns(() => rootLoggerSetup);
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
            const siblingTestSubject = new TestableContextAwareAppInsightsLoggerClient(globalLoggerClient.object);

            globalLoggerClient
                .setup((r) => r.setup())
                .callback(() => (rootLoggerSetup = true))
                .verifiable(Times.once());

            await testSubject.setup({});
            await siblingTestSubject.setup({});

            globalLoggerClient.verifyAll();
        });

        it('isInitialized works as expected with shared rootLoggerClient', async () => {
            const siblingTestSubject = new TestableContextAwareAppInsightsLoggerClient(globalLoggerClient.object);

            await testSubject.setup({});

            expect(testSubject.isInitialized()).toBe(true);
            expect(siblingTestSubject.isInitialized()).toBe(false);
        });
    });

    describe('getCommonProperties()', () => {
        it('should return properties from global logger', () => {
            const globalLoggerProps = {
                apiName: 'globalPropValue',
            };

            globalLoggerClient.setup((r) => r.getCommonProperties()).returns(() => globalLoggerProps);

            expect(testSubject.getCommonProperties()).toEqual(globalLoggerProps);
        });

        it('should merge properties from global logger', async () => {
            const globalLoggerProps = {
                apiName: 'globalPropValue',
            };
            globalLoggerClient.setup((r) => r.getCommonProperties()).returns(() => globalLoggerProps);

            const localLoggerProps = {
                scanId: '123',
            };
            await testSubject.setup({ ...localLoggerProps });

            expect(testSubject.getCommonProperties()).toEqual({ ...globalLoggerProps, ...localLoggerProps });
        });
    });
});
