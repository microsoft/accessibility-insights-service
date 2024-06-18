// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { TelemetryClient } from 'applicationinsights';
import { IMock, Mock, Times } from 'typemoq';
import { AppInsightsLoggerClient } from './app-insights-logger-client';
import { ContextAwareAppInsightsLoggerClient } from './context-aware-app-insights-logger-client';

export class TestableContextAwareAppInsightsLoggerClient extends ContextAwareAppInsightsLoggerClient {
    public client(): TelemetryClient {
        return this.telemetryClient;
    }
}

let telemetryClientMock: IMock<TelemetryClient>;

describe(ContextAwareAppInsightsLoggerClient, () => {
    let testSubject: TestableContextAwareAppInsightsLoggerClient;
    let globalLoggerClient: IMock<AppInsightsLoggerClient>;

    beforeEach(() => {
        globalLoggerClient = Mock.ofType(AppInsightsLoggerClient);
        telemetryClientMock = Mock.ofType<TelemetryClient>();

        testSubject = new TestableContextAwareAppInsightsLoggerClient(globalLoggerClient.object, () => telemetryClientMock.object);
    });

    it('should not create telemetry client without calling setup', async () => {
        expect(testSubject.client()).toBeUndefined();
    });

    describe('setup', () => {
        let rootLoggerSetup: boolean;

        beforeEach(() => {
            rootLoggerSetup = false;
            globalLoggerClient.setup((r) => r.setup()).callback(() => (rootLoggerSetup = true));
            globalLoggerClient.setup((r) => r.isInitialized()).returns(() => rootLoggerSetup);
        });

        it('should create telemetry client with base properties', async () => {
            const client = {
                commonProperties: {},
            } as TelemetryClient;
            testSubject = new TestableContextAwareAppInsightsLoggerClient(globalLoggerClient.object, () => client);
            await testSubject.setup({ source: 'foo' });
            expect(testSubject.client().commonProperties).toEqual({ source: 'foo' });
        });

        it('isInitialized returns correct values', async () => {
            expect(testSubject.isInitialized()).toBe(false);

            await testSubject.setup({});

            expect(testSubject.isInitialized()).toBe(true);
        });

        it('should only initialize rootLoggerClient once', async () => {
            const siblingTestSubject = new TestableContextAwareAppInsightsLoggerClient(
                globalLoggerClient.object,
                () => telemetryClientMock.object,
            );

            globalLoggerClient
                .setup((r) => r.setup())
                .callback(() => (rootLoggerSetup = true))
                .verifiable(Times.once());

            await testSubject.setup({});
            await siblingTestSubject.setup({});

            globalLoggerClient.verifyAll();
        });

        it('isInitialized works as expected with shared rootLoggerClient', async () => {
            const siblingTestSubject = new TestableContextAwareAppInsightsLoggerClient(
                globalLoggerClient.object,
                () => telemetryClientMock.object,
            );

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

            const client = {
                commonProperties: {},
            } as TelemetryClient;
            testSubject = new TestableContextAwareAppInsightsLoggerClient(globalLoggerClient.object, () => client);

            const localLoggerProps = {
                scanId: '123',
            };
            await testSubject.setup({ ...localLoggerProps });

            expect(testSubject.getCommonProperties()).toEqual({ ...globalLoggerProps, ...localLoggerProps });
        });
    });
});
