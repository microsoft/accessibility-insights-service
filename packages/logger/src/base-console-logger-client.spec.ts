// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import * as moment from 'moment';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import * as util from 'util';
import { BaseConsoleLoggerClient } from './base-console-logger-client';
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { LogLevel } from './logger';
import { ScanTaskFailedMeasurements } from './logger-event-measurements';
import { LoggerProperties } from './logger-properties';

// tslint:disable: no-null-keyword no-object-literal-type-assertion no-any no-void-expression no-empty no-unsafe-any

class TestableBaseConsoleLoggerClient extends BaseConsoleLoggerClient {
    public propertiesToAddToEvent: { [name: string]: string };

    protected getPropertiesToAddToEvent(): { [name: string]: string } {
        return this.propertiesToAddToEvent;
    }
}

describe(BaseConsoleLoggerClient, () => {
    let testSubject: TestableBaseConsoleLoggerClient;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let consoleMock: IMock<typeof console>;
    let logInConsole: boolean;
    const timestamp = '2020-06-21T23:33:00.111Z';

    beforeEach(() => {
        logInConsole = true;
        serviceConfigMock = Mock.ofType(ServiceConfiguration);

        serviceConfigMock
            .setup(async (s) => s.getConfigValue('logConfig'))
            .returns(async () => Promise.resolve({ logInConsole: logInConsole }));

        consoleMock = Mock.ofInstance({ log: () => {} } as typeof console);

        testSubject = new TestableBaseConsoleLoggerClient(serviceConfigMock.object, consoleMock.object);
        moment.prototype.toISOString = () => timestamp;
    });

    describe('console not enabled', () => {
        it('do not log', async () => {
            logInConsole = false;
            consoleMock = Mock.ofInstance({ log: () => {} } as typeof console, MockBehavior.Strict);
            testSubject = new TestableBaseConsoleLoggerClient(serviceConfigMock.object, consoleMock.object);

            await testSubject.setup();
            testSubject.trackMetric('metric1', 1);
            testSubject.trackEvent('HealthCheck');
            testSubject.log('trace1', LogLevel.info);
            testSubject.trackException(new Error('exception'));

            consoleMock.verifyAll();
        });
    });

    describe('trackMetric', () => {
        it('log data', async () => {
            await testSubject.setup(null);

            testSubject.trackMetric('metric1', 1);

            consoleMock.verify((c) => c.log(`[${timestamp}][Metric] metric1: 1`), Times.once());
        });

        it('log data with base properties with circular reference', async () => {
            const baseProps: BaseTelemetryProperties = { foo: 'bar', source: 'test-source' };
            (baseProps as any).y = baseProps;
            await testSubject.setup(baseProps);

            testSubject.trackMetric('metric1', 1);

            consoleMock.verify((c) => c.log(`[${timestamp}][Metric] metric1: 1\n${util.inspect({ ...baseProps })}`), Times.once());
        });

        it('log metric data with custom runtime properties', async () => {
            const baseProps: BaseTelemetryProperties = { source: 'test-source' };
            const customProps = { scanId: 'scan-id', batchRequestId: 'batch-req-id' };
            const mergedProps = { source: 'test-source', scanId: 'scan-id', batchRequestId: 'batch-req-id' };
            await testSubject.setup(baseProps);
            testSubject.setCommonProperties(customProps);

            testSubject.trackMetric('metric1', 1);

            consoleMock.verify((c) => c.log(`[${timestamp}][Metric] metric1: 1\n${util.inspect({ ...mergedProps })}`), Times.once());
        });

        it('log metric data with propertiesToAddToEvent', async () => {
            const baseProps: BaseTelemetryProperties = { source: 'test-source' };
            const customProps = { scanId: 'scan-id', batchRequestId: 'batch-req-id' };
            testSubject.propertiesToAddToEvent = { batchRequestId: 'overriddenVal1', propToAdd: 'val2' };
            const mergedProps = { source: 'test-source', scanId: 'scan-id', batchRequestId: 'overriddenVal1', propToAdd: 'val2' };

            await testSubject.setup(baseProps);
            testSubject.setCommonProperties(customProps);

            testSubject.trackMetric('metric1', 1);

            consoleMock.verify((c) => c.log(`[${timestamp}][Metric] metric1: 1\n${util.inspect({ ...mergedProps })}`), Times.once());
        });
    });

    describe('trackEvent', () => {
        it('log data without properties/measurements', async () => {
            await testSubject.setup(null);

            testSubject.trackEvent('HealthCheck');

            consoleMock.verify((c) => c.log(`[${timestamp}][Event][HealthCheck]`), Times.once());
        });

        it('log data with base properties', async () => {
            const baseProps: BaseTelemetryProperties = { foo: 'bar', source: 'test-source' };
            await testSubject.setup(baseProps);

            testSubject.trackEvent('HealthCheck');

            consoleMock.verify((c) => c.log(`[${timestamp}][Event][HealthCheck] \n${util.inspect(baseProps)}`), Times.once());
        });

        it('log event data with custom runtime properties', async () => {
            const baseProps: BaseTelemetryProperties = { source: 'test-source' };
            const customProps: LoggerProperties = { scanId: 'scan-id', batchRequestId: 'batch-req-id' };
            const mergedProps = { source: 'test-source', scanId: 'scan-id', batchRequestId: 'batch-req-id' };

            await testSubject.setup(baseProps);
            testSubject.setCommonProperties(customProps);

            testSubject.trackEvent('HealthCheck');

            consoleMock.verify((c) => c.log(`[${timestamp}][Event][HealthCheck] \n${util.inspect(mergedProps)}`), Times.once());
        });

        it('log event data with propertiesToAddToEvent', async () => {
            const baseProps: BaseTelemetryProperties = { source: 'test-source' };
            const customProps: LoggerProperties = { scanId: 'scan-id', batchRequestId: 'batch-req-id' };
            testSubject.propertiesToAddToEvent = { batchRequestId: 'overriddenVal1', propToAdd: 'val2' };
            const mergedProps = { source: 'test-source', scanId: 'scan-id', batchRequestId: 'overriddenVal1', propToAdd: 'val2' };

            await testSubject.setup(baseProps);
            testSubject.setCommonProperties(customProps);

            testSubject.trackEvent('HealthCheck');

            consoleMock.verify((c) => c.log(`[${timestamp}][Event][HealthCheck] \n${util.inspect(mergedProps)}`), Times.once());
        });

        it('log data with event properties and measurements', async () => {
            const baseProps: BaseTelemetryProperties = { foo: 'bar', source: 'test-source' };
            await testSubject.setup(baseProps);
            const eventProps = { eventProp1: 'prop value' };
            const eventMeasurements: ScanTaskFailedMeasurements = { failedScanTasks: 1 };

            testSubject.trackEvent('HealthCheck', eventProps, eventMeasurements);
            const properties = util.inspect({ ...baseProps, ...eventProps });
            const measurements = util.inspect(eventMeasurements);
            const expectedLogMessage = `[${timestamp}][Event][HealthCheck] ${measurements}\n${properties}`;

            consoleMock.verify((c) => c.log(expectedLogMessage), Times.once());
        });
    });

    describe('log', () => {
        it('log data without properties', async () => {
            await testSubject.setup(null);

            testSubject.log('trace1', LogLevel.verbose);

            consoleMock.verify((c) => c.log(`[${timestamp}][Trace][verbose] trace1`), Times.once());
        });

        it('log data with base properties', async () => {
            const baseProps: BaseTelemetryProperties = { foo: 'bar', source: 'test-source' };
            await testSubject.setup(baseProps);

            testSubject.log('trace1', LogLevel.warn);

            consoleMock.verify((c) => c.log(`[${timestamp}][Trace][warn] trace1\n${util.inspect(baseProps)}`), Times.once());
        });

        it('log trace data with custom runtime properties', async () => {
            const baseProps: BaseTelemetryProperties = { source: 'test-source' };
            const customProps: LoggerProperties = { scanId: 'scan-id', batchRequestId: 'batch-req-id' };
            const mergedProps = { source: 'test-source', scanId: 'scan-id', batchRequestId: 'batch-req-id' };
            await testSubject.setup(baseProps);
            testSubject.setCommonProperties(customProps);

            testSubject.log('trace1', LogLevel.warn);

            consoleMock.verify((c) => c.log(`[${timestamp}][Trace][warn] trace1\n${util.inspect(mergedProps)}`), Times.once());
        });

        it('log trace data with added custom runtime properties', async () => {
            const baseProps: BaseTelemetryProperties = { source: 'test-source' };
            const customProps: LoggerProperties = { scanId: 'scan-id', batchRequestId: 'batch-req-id' };
            testSubject.propertiesToAddToEvent = { batchRequestId: 'overriddenVal1', propToAdd: 'val2' };
            const mergedProps = {
                source: 'test-source',
                scanId: 'scan-id',
                batchRequestId: 'overriddenVal1',
                propToAdd: 'val2',
            };
            await testSubject.setup(baseProps);
            testSubject.setCommonProperties(customProps);

            testSubject.log('trace1', LogLevel.warn);

            consoleMock.verify((c) => c.log(`[${timestamp}][Trace][warn] trace1\n${util.inspect(mergedProps)}`), Times.once());
        });

        it('log data with event properties', async () => {
            const baseProps: BaseTelemetryProperties = { foo: 'bar', source: 'test-source' };
            await testSubject.setup(baseProps);
            const traceProps = { eventProp1: 'prop value' };

            testSubject.log('trace1', LogLevel.warn, traceProps);

            consoleMock.verify(
                (c) => c.log(`[${timestamp}][Trace][warn] trace1\n${util.inspect({ ...baseProps, ...traceProps })}`),
                Times.once(),
            );
        });
    });

    describe('trackException', () => {
        it('log data without properties', async () => {
            await testSubject.setup(null);
            const error = new Error('error1');

            testSubject.trackException(error);

            consoleMock.verify((c) => c.log(`[${timestamp}][Exception] ${util.inspect(error, { depth: null })}`), Times.once());
        });

        it('log data with base properties', async () => {
            const baseProps: BaseTelemetryProperties = { foo: 'bar', source: 'test-source' };
            await testSubject.setup(baseProps);
            const error = new Error('error1');

            testSubject.trackException(error);

            consoleMock.verify(
                (c) => c.log(`[${timestamp}][Exception] ${util.inspect(error, { depth: null })}\n${util.inspect(baseProps)}`),
                Times.once(),
            );
        });

        it('log data with custom runtime properties', async () => {
            const baseProps: BaseTelemetryProperties = { source: 'test-source' };
            const customProps: LoggerProperties = { scanId: 'scan-id', batchRequestId: 'batch-req-id' };
            const mergedProps = { source: 'test-source', scanId: 'scan-id', batchRequestId: 'batch-req-id' };
            await testSubject.setup(baseProps);
            const error = new Error('error1');

            testSubject.setCommonProperties(customProps);
            testSubject.trackException(error);

            consoleMock.verify(
                (c) => c.log(`[${timestamp}][Exception] ${util.inspect(error, { depth: null })}\n${util.inspect(mergedProps)}`),
                Times.once(),
            );
        });

        it('log data with custom runtime merged properties', async () => {
            const baseProps: BaseTelemetryProperties = { source: 'test-source' };
            const customProps: LoggerProperties = { scanId: 'scan-id', batchRequestId: 'batch-req-id' };
            testSubject.propertiesToAddToEvent = { batchRequestId: 'overriddenVal1', propToAdd: 'val2' };
            const mergedProps = { source: 'test-source', scanId: 'scan-id', batchRequestId: 'overriddenVal1', propToAdd: 'val2' };

            await testSubject.setup(baseProps);
            const error = new Error('error1');

            testSubject.setCommonProperties(customProps);
            testSubject.trackException(error);

            consoleMock.verify(
                (c) => c.log(`[${timestamp}][Exception] ${util.inspect(error, { depth: null })}\n${util.inspect(mergedProps)}`),
                Times.once(),
            );
        });
    });
});
