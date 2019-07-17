// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import * as _ from 'lodash';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import * as util from 'util';
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { ConsoleLoggerClient } from './console-logger-client';
import { LogLevel } from './logger';

// tslint:disable: no-null-keyword no-object-literal-type-assertion no-any no-void-expression no-empty

describe(ConsoleLoggerClient, () => {
    let testSubject: ConsoleLoggerClient;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let consoleMock: IMock<typeof console>;
    let logInConsole: boolean;

    beforeEach(() => {
        logInConsole = true;
        serviceConfigMock = Mock.ofType(ServiceConfiguration);

        serviceConfigMock.setup(async s => s.getConfigValue('logInConsole')).returns(async () => Promise.resolve(logInConsole));

        consoleMock = Mock.ofInstance({ log: () => {} } as typeof console);

        testSubject = new ConsoleLoggerClient(serviceConfigMock.object, consoleMock.object);
    });

    describe('console not enabled', () => {
        it('do not log', async () => {
            logInConsole = false;
            consoleMock = Mock.ofInstance({ log: () => {} } as typeof console, MockBehavior.Strict);
            testSubject = new ConsoleLoggerClient(serviceConfigMock.object, consoleMock.object);

            await testSubject.setup();
            testSubject.trackMetric('metric1', 1);
            testSubject.trackEvent('event1');
            testSubject.log('trace1', LogLevel.info);
            testSubject.trackException(new Error('exception'));

            consoleMock.verifyAll();
        });
    });

    describe('trackMetric', () => {
        it('log data', async () => {
            await testSubject.setup(null);

            testSubject.trackMetric('metric1', 1);

            consoleMock.verify(c => c.log('[Metric] === metric1 - 1'), Times.once());
        });

        it('log data with base properties with circular reference', async () => {
            const baseProps: BaseTelemetryProperties = { foo: 'bar', source: 'test-source' };
            (baseProps as any).y = baseProps;
            await testSubject.setup(baseProps);

            testSubject.trackMetric('metric1', 1);

            consoleMock.verify(c => c.log(`[Metric][properties - ${util.inspect({ ...baseProps })}] === metric1 - 1`), Times.once());
        });
    });

    describe('trackEvent', () => {
        it('log data without properties', async () => {
            await testSubject.setup(null);

            testSubject.trackEvent('event1');

            consoleMock.verify(c => c.log('[Event] === event1'), Times.once());
        });

        it('log data with base properties', async () => {
            const baseProps: BaseTelemetryProperties = { foo: 'bar', source: 'test-source' };
            await testSubject.setup(baseProps);

            testSubject.trackEvent('event1');

            consoleMock.verify(c => c.log(`[Event][properties - ${util.inspect(baseProps)}] === event1`), Times.once());
        });

        it('log data with event properties', async () => {
            const baseProps: BaseTelemetryProperties = { foo: 'bar', source: 'test-source' };
            await testSubject.setup(baseProps);
            const eventProps = { eventProp1: 'prop value' };

            testSubject.trackEvent('event1', eventProps);

            consoleMock.verify(
                c => c.log(`[Event][properties - ${util.inspect({ ...baseProps, ...eventProps })}] === event1`),
                Times.once(),
            );
        });
    });

    describe('log', () => {
        it('log data without properties', async () => {
            await testSubject.setup(null);

            testSubject.log('trace1', LogLevel.verbose);

            consoleMock.verify(c => c.log('[Trace][verbose] === trace1'), Times.once());
        });

        it('log data with base properties', async () => {
            const baseProps: BaseTelemetryProperties = { foo: 'bar', source: 'test-source' };
            await testSubject.setup(baseProps);

            testSubject.log('trace1', LogLevel.warn);

            consoleMock.verify(c => c.log(`[Trace][warn][properties - ${util.inspect(baseProps)}] === trace1`), Times.once());
        });

        it('log data with event properties', async () => {
            const baseProps: BaseTelemetryProperties = { foo: 'bar', source: 'test-source' };
            await testSubject.setup(baseProps);
            const traceProps = { eventProp1: 'prop value' };

            testSubject.log('trace1', LogLevel.warn, traceProps);

            consoleMock.verify(
                c => c.log(`[Trace][warn][properties - ${util.inspect({ ...baseProps, ...traceProps })}] === trace1`),
                Times.once(),
            );
        });
    });

    describe('trackException', () => {
        it('log data without properties', async () => {
            await testSubject.setup(null);
            const error = new Error('error1');

            testSubject.trackException(error);

            consoleMock.verify(c => c.log(`[Exception] === ${util.inspect(error, { depth: null })}`), Times.once());
        });

        it('log data with base properties', async () => {
            const baseProps: BaseTelemetryProperties = { foo: 'bar', source: 'test-source' };
            await testSubject.setup(baseProps);
            const error = new Error('error1');

            testSubject.trackException(error);

            consoleMock.verify(
                c => c.log(`[Exception][properties - ${util.inspect(baseProps)}] === ${util.inspect(error, { depth: null })}`),
                Times.once(),
            );
        });
    });
});
