// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { TelemetryClient } from 'applicationinsights';
import { IMock, Mock } from 'typemoq';
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
        it('should create telemetry client with base properties', async () => {
            await testSubject.setup({ source: 'foo' });

            expect(testSubject.getTelemetryClient().commonProperties).toEqual({ source: 'foo' });
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
