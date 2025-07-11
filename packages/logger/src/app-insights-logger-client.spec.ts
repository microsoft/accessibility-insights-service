// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as appInsights from 'applicationinsights';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { AppInsightsLoggerClient } from './app-insights-logger-client';

/* eslint-disable
   @typescript-eslint/consistent-type-assertions,
   @typescript-eslint/no-explicit-any,
   no-void,
   no-empty,
   @typescript-eslint/no-empty-function
*/

describe(AppInsightsLoggerClient, () => {
    let appInsightsMock: IMock<typeof appInsights>;
    let appInsightsConfigMock: IMock<typeof appInsights.Configuration>;
    let testSubject: AppInsightsLoggerClient;
    let appInsightsTelemetryClientMock: IMock<appInsights.TelemetryClient>;
    let processStub: typeof process;
    let envVariables: {
        [key: string]: string;
    };
    let commonProperties: {
        [key: string]: string;
    };

    beforeEach(() => {
        appInsightsMock = Mock.ofType<typeof appInsights>(null, MockBehavior.Strict);
        appInsightsConfigMock = Mock.ofType<typeof appInsights.Configuration>(null, MockBehavior.Strict);
        appInsightsTelemetryClientMock = Mock.ofInstance<appInsights.TelemetryClient>(
            {
                commonProperties: null,
            } as appInsights.TelemetryClient,
            MockBehavior.Loose,
            false,
        );

        envVariables = {
            AZ_BATCH_POOL_ID: 'pool 1',
            AZ_BATCH_JOB_ID: 'job 1',
            AZ_BATCH_TASK_ID: 'task 1',
            AZ_BATCH_NODE_ID: 'node 1',
        };
        commonProperties = {
            batchPoolId: 'pool 1',
            batchJobId: 'job 1',
            batchTaskId: 'task 1',
            batchNodeId: 'node 1',
        };

        processStub = {} as typeof process;
        processStub.env = envVariables;

        appInsightsMock
            .setup((a) => a.defaultClient)
            .returns(() => appInsightsTelemetryClientMock.object)
            .verifiable(Times.atLeastOnce());

        testSubject = new AppInsightsLoggerClient(appInsightsMock.object, processStub);
    });

    describe('setup', () => {
        beforeEach(() => {
            setupCallsForTelemetrySetup();
        });

        it('verify default setup', async () => {
            await testSubject.setup(null);

            verifyCommonProperties();
            verifyMocks();
        });

        it('initializes with additional common properties', async () => {
            const additionalCommonProps = { foo: 'bar', source: 'test-source' };

            await testSubject.setup(additionalCommonProps);

            verifyCommonProperties(additionalCommonProps);
            verifyMocks();
        });

        it('isInitialized', async () => {
            expect(testSubject.isInitialized()).toBe(false);

            await testSubject.setup(null);

            expect(testSubject.isInitialized()).toBe(true);
        });

        it('setup without batch properties', async () => {
            commonProperties = {};
            envVariables = {};
            processStub.env = envVariables;

            await testSubject.setup(null);

            verifyCommonProperties();
            verifyMocks();
        });
    });

    function verifyMocks(): void {
        appInsightsMock.verifyAll();
        appInsightsConfigMock.verifyAll();
        appInsightsTelemetryClientMock.verifyAll();
    }

    function setupCallsForTelemetrySetup(): void {
        setupAppInsightsCall();
        setupAppInsightsConfigurationCall();
    }

    function verifyCommonProperties(additionalProps?: { [key: string]: string }): void {
        appInsightsTelemetryClientMock.verify(
            (t) => (t.commonProperties = It.isValue({ ...commonProperties, ...additionalProps })),
            Times.atLeastOnce(),
        );
    }

    function setupAppInsightsCall(): void {
        appInsightsMock.setup((a) => a.setup()).returns(() => appInsightsConfigMock.object);
        appInsightsMock.setup((a) => a.start()).verifiable(Times.once());
    }

    function setupAppInsightsConfigurationCall(): void {
        appInsightsConfigMock
            .setup((c) => c.setAutoCollectConsole(true))
            .returns(() => appInsightsConfigMock.object)
            .verifiable(Times.once());
    }
});
