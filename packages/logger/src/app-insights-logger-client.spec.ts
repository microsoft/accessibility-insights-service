// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as appInsights from 'applicationinsights';
import * as _ from 'lodash';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { AppInsightsLoggerClient } from './app-insights-logger-client';
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { LogLevel } from './logger';

// tslint:disable: no-null-keyword no-object-literal-type-assertion no-any no-void-expression

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
        appInsightsTelemetryClientMock = Mock.ofType<appInsights.TelemetryClient>(null);

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

        appInsightsTelemetryClientMock.setup(t => t.commonProperties);

        appInsightsMock
            .setup(a => a.defaultClient)
            .returns(() => appInsightsTelemetryClientMock.object)
            .verifiable(Times.atLeastOnce());

        testSubject = new AppInsightsLoggerClient(appInsightsMock.object, processStub);
    });

    describe('setup', () => {
        it('verify default setup', async () => {
            setupCallsForTelemetrySetup();

            await testSubject.setup(null);

            verifyMocks();
        });

        it('initializes with additional common properties', async () => {
            const additionalCommonProps: BaseTelemetryProperties = { foo: 'bar', source: 'test-source' };
            setupCallsForTelemetrySetup(additionalCommonProps);

            await testSubject.setup(additionalCommonProps);

            verifyMocks();
        });
    });

    describe('trackMetric', () => {
        it('when value passed', async () => {
            setupCallsForTelemetrySetup();
            await testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            appInsightsTelemetryClientMock.setup(t => t.trackMetric(It.isValue({ name: 'metric1', value: 10 }))).verifiable();

            testSubject.trackMetric('metric1', 10);

            verifyMocks();
        });
    });
    describe('trackEvent', () => {
        it('when properties not passed', async () => {
            setupCallsForTelemetrySetup();
            await testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            appInsightsTelemetryClientMock.setup(t => t.trackEvent(It.isValue({ name: 'event1', properties: undefined }))).verifiable();

            testSubject.trackEvent('event1');

            verifyMocks();
        });

        it('when properties passed', async () => {
            setupCallsForTelemetrySetup();
            await testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            appInsightsTelemetryClientMock
                .setup(t => t.trackEvent(It.isValue({ name: 'event1', properties: { foo: 'bar' } })))
                .verifiable();

            testSubject.trackEvent('event1', { foo: 'bar' });

            verifyMocks();
        });
    });

    describe('log', () => {
        it('when properties not passed', async () => {
            setupCallsForTelemetrySetup();
            await testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            appInsightsTelemetryClientMock
                .setup(t =>
                    t.trackTrace(
                        It.isValue({ message: 'trace1', severity: appInsights.Contracts.SeverityLevel.Information, properties: undefined }),
                    ),
                )
                .verifiable();

            testSubject.log('trace1', LogLevel.info);

            verifyMocks();
        });

        interface TrackTraceTestCase {
            logLevel: LogLevel;
            appInsightsLogLevel: appInsights.Contracts.SeverityLevel;
        }

        test.each([
            {
                logLevel: LogLevel.error,
                appInsightsLogLevel: appInsights.Contracts.SeverityLevel.Error,
            },
            {
                logLevel: LogLevel.warn,
                appInsightsLogLevel: appInsights.Contracts.SeverityLevel.Warning,
            },
            {
                logLevel: LogLevel.info,
                appInsightsLogLevel: appInsights.Contracts.SeverityLevel.Information,
            },
            {
                logLevel: LogLevel.verbose,
                appInsightsLogLevel: appInsights.Contracts.SeverityLevel.Verbose,
            },
        ])('when properties passed %o', async (testCase: TrackTraceTestCase) => {
            setupCallsForTelemetrySetup();
            await testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            appInsightsTelemetryClientMock
                .setup(t =>
                    t.trackTrace(
                        It.isValue({
                            message: 'trace1',
                            severity: testCase.appInsightsLogLevel,
                            properties: { foo: 'bar' },
                        }),
                    ),
                )
                .verifiable();

            testSubject.log('trace1', testCase.logLevel, { foo: 'bar' });

            verifyMocks();
        });
    });

    describe('trackException', () => {
        it('trackException', () => {
            const error = new Error('some error');

            appInsightsTelemetryClientMock.setup(t => t.trackException({ exception: error })).verifiable();

            testSubject.trackException(error);
            verifyMocks();
        });
    });

    describe('flush', () => {
        it('flushes events', () => {
            appInsightsTelemetryClientMock.setup(t => t.flush()).verifiable();

            testSubject.flush();
        });
    });

    function verifyMocks(): void {
        appInsightsMock.verifyAll();
        appInsightsConfigMock.verifyAll();
        appInsightsTelemetryClientMock.verifyAll();
    }

    function setupCallsForTelemetrySetup(additionalCommonProps?: { [key: string]: string }): void {
        setupAppInsightsCall();
        setupAppInsightsConfigurationCall();
        setupCommonPropertiesCall(additionalCommonProps);
    }

    function setupCommonPropertiesCall(additionalProps?: { [key: string]: string }): void {
        const props = { ...commonProperties, ...additionalProps };

        appInsightsTelemetryClientMock.setup(t => (t.commonProperties = It.isValue(props))).verifiable(Times.once());
    }

    function setupAppInsightsCall(): void {
        appInsightsMock.setup(a => a.setup()).returns(() => appInsightsConfigMock.object);
        appInsightsMock.setup(a => a.start()).verifiable(Times.once());
    }

    function setupAppInsightsConfigurationCall(): void {
        appInsightsConfigMock
            .setup(c => c.setAutoCollectConsole(true))
            .returns(() => appInsightsConfigMock.object)
            .verifiable(Times.once());

        appInsightsConfigMock
            .setup(c => c.setAutoCollectExceptions(true))
            .returns(() => appInsightsConfigMock.object)
            .verifiable(Times.once());

        appInsightsConfigMock
            .setup(c => c.setAutoCollectDependencies(true))
            .returns(() => appInsightsConfigMock.object)
            .verifiable(Times.once());

        appInsightsConfigMock
            .setup(c => c.setAutoDependencyCorrelation(true))
            .returns(() => appInsightsConfigMock.object)
            .verifiable(Times.once());

        appInsightsConfigMock
            .setup(c => c.setAutoCollectRequests(true))
            .returns(() => appInsightsConfigMock.object)
            .verifiable(Times.once());
    }
});
