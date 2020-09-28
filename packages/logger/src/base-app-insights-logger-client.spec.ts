// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as appInsights from 'applicationinsights';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { AvailabilityTelemetry } from './availability-telemetry';
import { BaseAppInsightsLoggerClient } from './base-app-insights-logger-client';
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { LogLevel } from './logger';

/* eslint-disable
   @typescript-eslint/consistent-type-assertions,
   @typescript-eslint/no-explicit-any,
   no-void,
   no-empty,
   @typescript-eslint/no-empty-function
*/

interface TrackTraceTestCase {
    logLevel: LogLevel;
    appInsightsLogLevel: appInsights.Contracts.SeverityLevel;
}

class TestableBaseAppInsightsLoggerClient extends BaseAppInsightsLoggerClient {
    public additionalPropsToAdd = { adProp1: 'val1', adProp2: 'val2' };
    public telemetryClientMock: IMock<appInsights.TelemetryClient>;
    public appInsightsConfigMock: IMock<typeof appInsights.Configuration>;

    // eslint-disable-next-line no-empty,@typescript-eslint/no-empty-function
    public async setup(baseProperties?: BaseTelemetryProperties): Promise<void> {
        this.telemetryClientMock = Mock.ofInstance<appInsights.TelemetryClient>(
            {
                commonProperties: null,
                config: null,
                channel: null,
                trackTrace: (() => {}) as any,
                trackMetric: (() => {}) as any,
                trackException: (() => {}) as any,
                flush: (async () => {}) as any,
                trackEvent: (() => {}) as any,
                trackAvailability: (() => {}) as any,
            } as appInsights.TelemetryClient,
            MockBehavior.Loose,
            false,
        );

        if (baseProperties !== undefined) {
            this.telemetryClientMock
                .setup((o) => o.commonProperties)
                .returns(() => {
                    return { ...baseProperties };
                });
        }

        this.telemetryClient = this.telemetryClientMock.object;
        this.appInsightsConfigMock = Mock.ofType<typeof appInsights.Configuration>(null);
        this.telemetryClientMock.setup((t) => t.config).returns(() => this.appInsightsConfigMock.object as any);
    }

    public getTelemetryClient(): appInsights.TelemetryClient {
        return this.telemetryClient;
    }
}

describe(BaseAppInsightsLoggerClient, () => {
    let testSubject: TestableBaseAppInsightsLoggerClient;
    let processStub: typeof process;
    let envVariables: {
        [key: string]: string;
    };
    let commonProperties: {
        [key: string]: string;
    };

    beforeEach(async () => {
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

        testSubject = new TestableBaseAppInsightsLoggerClient();

        await testSubject.setup();
    });

    describe('setup', () => {
        it('should not create telemetry client without calling setup', () => {
            testSubject = new TestableBaseAppInsightsLoggerClient();

            expect(testSubject.getTelemetryClient()).toBeUndefined();
        });

        it('should use the telemetry client created by child class', async () => {
            expect(testSubject.getTelemetryClient()).toBe(testSubject.telemetryClientMock.object);
        });
    });

    describe('trackMetric', () => {
        it('when value passed', async () => {
            testSubject.telemetryClientMock
                .setup((t) =>
                    t.trackMetric(It.isValue({ name: 'metric1', value: 10, properties: { ...testSubject.getCommonProperties() } })),
                )
                .verifiable();

            testSubject.trackMetric('metric1', 10);

            verifyMocks();
        });
    });

    describe('trackEvent', () => {
        it('when properties/measurements not passed', async () => {
            testSubject.telemetryClientMock
                .setup((t) =>
                    t.trackEvent(
                        It.isValue({
                            name: 'HealthCheck',
                            properties: { ...testSubject.getCommonProperties() },
                            measurements: undefined,
                        }),
                    ),
                )
                .verifiable();

            testSubject.trackEvent('HealthCheck');

            verifyMocks();
        });

        it('when properties/measurements passed', async () => {
            testSubject.telemetryClientMock
                .setup((t) =>
                    t.trackEvent(
                        It.isValue({
                            name: 'HealthCheck',
                            properties: { foo: 'bar', ...testSubject.getCommonProperties() },
                            measurements: { completedScanRequests: 1 },
                        }),
                    ),
                )
                .verifiable();

            testSubject.trackEvent('HealthCheck', { foo: 'bar' }, { completedScanRequests: 1 });

            verifyMocks();
        });
    });

    describe('log', () => {
        it('when properties not passed', async () => {
            await testSubject.setup();

            testSubject.telemetryClientMock
                .setup((t) =>
                    t.trackTrace(
                        It.isValue({
                            message: 'trace1',
                            severity: appInsights.Contracts.SeverityLevel.Information,
                            properties: { ...testSubject.getCommonProperties() },
                        }),
                    ),
                )
                .verifiable();

            testSubject.log('trace1', LogLevel.info);

            verifyMocks();
        });

        it('expand log message with source', async () => {
            await testSubject.setup({ source: 'log source' });

            testSubject.telemetryClientMock
                .setup((t) =>
                    t.trackTrace(
                        It.isValue({
                            message: '[log source] log message',
                            severity: appInsights.Contracts.SeverityLevel.Information,
                            properties: { ...testSubject.getCommonProperties() },
                        }),
                    ),
                )
                .verifiable();

            testSubject.log('log message', LogLevel.info);

            verifyMocks();
        });

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
            await testSubject.setup();

            testSubject.telemetryClientMock
                .setup((t) =>
                    t.trackTrace(
                        It.isValue({
                            message: 'trace1',
                            severity: testCase.appInsightsLogLevel,
                            properties: { foo: 'bar', ...testSubject.getCommonProperties() },
                        }),
                    ),
                )
                .verifiable();

            testSubject.log('trace1', testCase.logLevel, { foo: 'bar' });

            verifyMocks();
        });
    });

    describe('trackAvailability', () => {
        it('sends availability telemetry', async () => {
            await testSubject.setup();

            // eslint-disable-next-line no-empty,@typescript-eslint/no-empty-function

            const telemetryName = 'test';
            const availabilityData: AvailabilityTelemetry = {
                id: '1',
                success: false,
                duration: 1,
                properties: 'test properties' as any,
                measurements: 'test measurements' as any,
                message: 'message 1',
                runLocation: 'westus',
            };

            testSubject.telemetryClientMock
                .setup((t) =>
                    t.trackAvailability({
                        name: telemetryName,
                        success: availabilityData.success,
                        message: availabilityData.message,
                        duration: availabilityData.duration,
                        runLocation: availabilityData.runLocation,
                        measurements: availabilityData.measurements,
                        properties: availabilityData.properties,
                        id: availabilityData.id,
                    }),
                )
                .verifiable(Times.once());

            testSubject.trackAvailability(telemetryName, availabilityData);

            verifyMocks();
        });
    });

    describe('trackException', () => {
        it('invokes api with additional props', () => {
            const error = new Error('some error');

            testSubject.telemetryClientMock
                .setup((t) => t.trackException({ exception: error, properties: { ...testSubject.getCommonProperties() } }))
                .verifiable();

            testSubject.trackException(error);
            verifyMocks();
        });
    });

    describe('flush', () => {
        beforeEach(async () => {
            await testSubject.setup();
        });

        it('flushes events', async () => {
            let flushCb: () => void;
            testSubject.telemetryClientMock
                .setup((t) => t.flush(It.isAny()))
                .returns((options) => {
                    flushCb = options.callback;
                    flushCb();
                })
                .verifiable();

            await testSubject.flush();
            expect(flushCb).toBeDefined();
            verifyMocks();
        });
    });

    describe('setCommonProperties', () => {
        beforeEach(async () => {
            testSubject.telemetryClientMock.setup((t) => t.commonProperties).returns(() => commonProperties);
        });

        it('sets custom properties on telemetry client', () => {
            const newCommonProps = { apiName: 'val1', scanId: 'val2' };

            testSubject.setCommonProperties(newCommonProps);

            verifyCommonProperties(newCommonProps);
            verifyMocks();
        });
    });

    function verifyMocks(): void {
        testSubject.telemetryClientMock.verifyAll();
    }

    function verifyCommonProperties(additionalProps?: { [key: string]: string }): void {
        testSubject.telemetryClientMock.verify(
            (t) => (t.commonProperties = It.isValue({ ...commonProperties, ...additionalProps })),
            Times.atLeastOnce(),
        );
    }
});
