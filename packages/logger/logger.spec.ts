import * as appInsights from 'applicationinsights';
import * as _ from 'lodash';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { Logger } from './logger';
// tslint:disable: no-null-keyword no-object-literal-type-assertion no-any no-void-expression

describe(Logger, () => {
    let appInsightsMock: IMock<typeof appInsights>;
    let appInsightsConfigMock: IMock<typeof appInsights.Configuration>;
    let testSubject: Logger;
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

        testSubject = new Logger(appInsightsMock.object, processStub);
    });

    describe('setup', () => {
        it('verify default setup', () => {
            setupCallsForTelemetrySetup();

            testSubject.setup(null);

            verifyMocks();
        });

        it('does not initialize more than once', () => {
            setupCallsForTelemetrySetup();

            testSubject.setup(null);
            testSubject.setup(null);

            verifyMocks();
        });

        it('initializes with additional common properties', () => {
            const additionalCommonProps = { foo: 'bar' };
            setupCallsForTelemetrySetup(additionalCommonProps);

            testSubject.setup(additionalCommonProps);

            verifyMocks();
        });
    });

    describe('trackMetric', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.trackMetric('metric1', 1);
            }).toThrowError('Telemetry client not setup');
        });

        it('when value not passed', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            appInsightsTelemetryClientMock.setup(t => t.trackMetric(It.isValue({ name: 'metric1', value: 1 }))).verifiable();

            testSubject.trackMetric('metric1');

            verifyMocks();
        });

        it('when value passed', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            appInsightsTelemetryClientMock.setup(t => t.trackMetric(It.isValue({ name: 'metric1', value: 10 }))).verifiable();

            testSubject.trackMetric('metric1', 10);

            verifyMocks();
        });
    });
    describe('trackEvent', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.trackEvent('event1', { foo: 'bar' });
            }).toThrowError('Telemetry client not setup');
        });

        it('when properties not passed', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            appInsightsTelemetryClientMock.setup(t => t.trackEvent(It.isValue({ name: 'event1', properties: undefined }))).verifiable();

            testSubject.trackEvent('event1');

            verifyMocks();
        });

        it('when properties passed', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            appInsightsTelemetryClientMock
                .setup(t => t.trackEvent(It.isValue({ name: 'event1', properties: { foo: 'bar' } })))
                .verifiable();

            testSubject.trackEvent('event1', { foo: 'bar' });

            verifyMocks();
        });
    });

    describe('trackTrace', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.trackTrace('trace1', appInsights.Contracts.SeverityLevel.Warning);
            }).toThrowError('Telemetry client not setup');
        });

        it('when properties not passed', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            appInsightsTelemetryClientMock
                .setup(t =>
                    t.trackTrace(
                        It.isValue({ message: 'trace1', severity: appInsights.Contracts.SeverityLevel.Verbose, properties: undefined }),
                    ),
                )
                .verifiable();

            testSubject.trackTrace('trace1', appInsights.Contracts.SeverityLevel.Verbose);

            verifyMocks();
        });

        it('when properties passed', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            appInsightsTelemetryClientMock
                .setup(t =>
                    t.trackTrace(
                        It.isValue({
                            message: 'trace1',
                            severity: appInsights.Contracts.SeverityLevel.Verbose,
                            properties: { foo: 'bar' },
                        }),
                    ),
                )
                .verifiable();

            testSubject.trackTrace('trace1', appInsights.Contracts.SeverityLevel.Verbose, { foo: 'bar' });

            verifyMocks();
        });
    });

    describe('trackInfoTrace', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.trackInfoTrace('trace1');
            }).toThrowError('Telemetry client not setup');
        });

        it('when properties not passed', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            appInsightsTelemetryClientMock
                .setup(t =>
                    t.trackTrace(
                        It.isValue({ message: 'trace1', severity: appInsights.Contracts.SeverityLevel.Information, properties: undefined }),
                    ),
                )
                .verifiable();

            testSubject.trackInfoTrace('trace1');

            verifyMocks();
        });

        it('when properties passed', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup(null);
            appInsightsTelemetryClientMock.reset();

            appInsightsTelemetryClientMock
                .setup(t =>
                    t.trackTrace(
                        It.isValue({
                            message: 'trace1',
                            severity: appInsights.Contracts.SeverityLevel.Information,
                            properties: { foo: 'bar' },
                        }),
                    ),
                )
                .verifiable();

            testSubject.trackInfoTrace('trace1', { foo: 'bar' });

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
            .setup(c => c.setAutoCollectConsole(false))
            .returns(() => appInsightsConfigMock.object)
            .verifiable(Times.once());

        appInsightsConfigMock
            .setup(c => c.setAutoCollectExceptions(true))
            .returns(() => appInsightsConfigMock.object)
            .verifiable(Times.once());
        appInsightsConfigMock
            .setup(c => c.setAutoCollectRequests(false))
            .returns(() => appInsightsConfigMock.object)
            .verifiable(Times.once());
    }
});
