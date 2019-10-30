// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as appInsights from 'applicationinsights';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';

import { AppInsightsLoggerClient } from './app-insights-logger-client';
import { AvailabilityTelemetry } from './availablity-telemetry';
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { LogLevel } from './logger';

// tslint:disable: no-null-keyword no-object-literal-type-assertion no-any no-void-expression

describe(AppInsightsLoggerClient, () => {
    let appInsightsMock: IMock<typeof appInsights>;
    let appInsightsConfigMock: IMock<typeof appInsights.Configuration>;
    let appInsightsContractMock: IMock<typeof appInsights.Contracts>;
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
        appInsightsContractMock = Mock.ofType<typeof appInsights.Contracts>(null);

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

            appInsightsTelemetryClientMock
                .setup(t => t.trackMetric(It.isValue({ name: 'metric1', value: 10, properties: {} })))
                .verifiable();

            testSubject.trackMetric('metric1', 10);

            verifyMocks();
        });
    });

    describe('trackEvent', () => {
        it('when properties/measurements not passed', async () => {
            setupCallsForTelemetrySetup();
            await testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            appInsightsTelemetryClientMock
                .setup(t => t.trackEvent(It.isValue({ name: 'HealthCheck', properties: {}, measurements: undefined })))
                .verifiable();

            testSubject.trackEvent('HealthCheck');

            verifyMocks();
        });

        it('when properties/measurements passed', async () => {
            setupCallsForTelemetrySetup();
            await testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            appInsightsTelemetryClientMock
                .setup(t =>
                    t.trackEvent(It.isValue({ name: 'HealthCheck', properties: { foo: 'bar' }, measurements: { scanWaitTime: 1 } })),
                )
                .verifiable();

            testSubject.trackEvent('HealthCheck', { foo: 'bar' }, { scanWaitTime: 1 });

            verifyMocks();
        });
    });

    describe('trackAvailability', () => {
        it('sends availability telemetry', async () => {
            setupCallsForTelemetrySetup();
            await testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();
            // tslint:disable-next-line: no-empty
            const sendMock = Mock.ofInstance((data: any) => {});
            const channelStub = {
                send: sendMock.object,
            };
            const telemetryName = 'test';
            const availabilityData: AvailabilityTelemetry = {
                id: '1',
                success: false,
            };

            appInsightsTelemetryClientMock
                .setup(t => t.channel)
                .returns(() => channelStub as any)
                .verifiable(Times.atLeastOnce());
            sendMock
                .setup(send =>
                    send(
                        It.is(availabilityEnvelope => {
                            // tslint:disable-next-line: no-unsafe-any
                            const data = availabilityEnvelope.data.baseData;

                            // tslint:disable-next-line: no-unsafe-any
                            return data.id === availabilityData.id && data.name === telemetryName;
                        }),
                    ),
                )
                .verifiable();

            testSubject.trackAvailability(telemetryName, availabilityData);

            sendMock.verifyAll();
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
                        It.isValue({ message: 'trace1', severity: appInsights.Contracts.SeverityLevel.Information, properties: {} }),
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

            appInsightsTelemetryClientMock.setup(t => t.trackException({ exception: error, properties: {} })).verifiable();

            testSubject.trackException(error);
            verifyMocks();
        });
    });

    describe('flush', () => {
        it('flushes events', () => {
            appInsightsTelemetryClientMock.setup(t => t.flush()).verifiable();

            testSubject.flush();
            verifyMocks();
        });
    });

    describe('set custom dimensions at runtime', () => {
        it('set custom dimensions for log', async () => {
            setupCallsForTelemetrySetup();
            await testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            const customDimensionAssignments = { scanId: 'scan-id', batchRequestId: 'batch-req-id' };
            appInsightsTelemetryClientMock
                .setup(t =>
                    t.trackTrace(
                        It.isValue({
                            message: 'trace1',
                            severity: appInsights.Contracts.SeverityLevel.Information,
                            properties: customDimensionAssignments,
                        }),
                    ),
                )
                .verifiable();
            testSubject.setCustomProperties(customDimensionAssignments);
            testSubject.log('trace1', LogLevel.info);
            verifyMocks();
        });

        it('set custom dimensions for trackMetric', async () => {
            setupCallsForTelemetrySetup();
            await testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            const customDimensionAssignments = { scanId: 'scan-id', batchRequestId: 'batch-req-id' };
            appInsightsTelemetryClientMock
                .setup(t =>
                    t.trackMetric(
                        It.isValue({
                            name: 'metric1',
                            value: 10,
                            properties: customDimensionAssignments,
                        }),
                    ),
                )
                .verifiable();
            testSubject.setCustomProperties(customDimensionAssignments);
            testSubject.trackMetric('metric1', 10);
            verifyMocks();
        });

        it('set custom dimensions for trackException', async () => {
            setupCallsForTelemetrySetup();
            await testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            const error = new Error('some error');
            const customDimensionAssignments = { scanId: 'scan-id', batchRequestId: 'batch-req-id' };
            appInsightsTelemetryClientMock
                .setup(t =>
                    t.trackException(
                        It.isValue({
                            exception: error,
                            properties: customDimensionAssignments,
                        }),
                    ),
                )
                .verifiable();
            testSubject.setCustomProperties(customDimensionAssignments);
            testSubject.trackException(error);
            verifyMocks();
        });

        it('set custom dimensions for trackEvent', async () => {
            setupCallsForTelemetrySetup();
            await testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            const customDimensionAssignments = { scanId: 'scan-id', batchRequestId: 'batch-req-id' };
            appInsightsTelemetryClientMock
                .setup(t =>
                    t.trackEvent(
                        It.isValue({
                            name: 'HealthCheck',
                            properties: customDimensionAssignments,
                            measurements: undefined,
                        }),
                    ),
                )
                .verifiable();
            testSubject.setCustomProperties(customDimensionAssignments);
            testSubject.trackEvent('HealthCheck');
            verifyMocks();
        });

        it('override custom dimensions in a single log call', async () => {
            setupCallsForTelemetrySetup();
            await testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            const customDimensionAssignments = { scanId: 'scan-id-1', batchRequestId: 'batch-req-id' };
            appInsightsTelemetryClientMock
                .setup(t =>
                    t.trackEvent(
                        It.isValue({
                            name: 'HealthCheck',
                            properties: { scanId: 'scan-id-2', batchRequestId: 'batch-req-id' },
                            measurements: undefined,
                        }),
                    ),
                )
                .verifiable();

            testSubject.setCustomProperties(customDimensionAssignments);
            testSubject.trackEvent('HealthCheck', { scanId: 'scan-id-2' });
            verifyMocks();

            appInsightsTelemetryClientMock.reset();
            appInsightsTelemetryClientMock
                .setup(t =>
                    t.trackEvent(
                        It.isValue({
                            name: 'HealthCheck',
                            properties: customDimensionAssignments,
                            measurements: undefined,
                        }),
                    ),
                )
                .verifiable();
            testSubject.trackEvent('HealthCheck');
            verifyMocks();
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
