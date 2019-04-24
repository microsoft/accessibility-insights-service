import 'reflect-metadata';

import * as _ from 'lodash';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import * as util from 'util';
import { ConsoleLoggerClient } from './console-logger-client';
import { LogLevel } from './logger';

// tslint:disable: no-null-keyword no-object-literal-type-assertion no-any no-void-expression no-empty

describe(ConsoleLoggerClient, () => {
    let testSubject: ConsoleLoggerClient;
    let processStub: typeof process;
    let consoleMock: IMock<typeof console>;

    beforeEach(() => {
        processStub = { execArgv: ['--test', '--console'] } as typeof process;

        consoleMock = Mock.ofInstance({ log: () => {} } as typeof console);

        testSubject = new ConsoleLoggerClient(processStub, consoleMock.object);
    });

    describe('console not enabled', () => {
        it('donot log', () => {
            processStub = { execArgv: ['--test', '--console23'] } as typeof process;
            consoleMock = Mock.ofInstance({ log: () => {} } as typeof console, MockBehavior.Strict);
            testSubject = new ConsoleLoggerClient(processStub, consoleMock.object);

            testSubject.setup();
            testSubject.trackMetric('metric1', 1);
            testSubject.trackEvent('event1');
            testSubject.log('trace1', LogLevel.info);
            testSubject.trackException(new Error('exception'));

            consoleMock.verifyAll();
        });
    });

    describe('trackMetric', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.trackMetric('metric1', 1);
            }).toThrowError('ConsoleLoggerClient not setup');
        });

        it('log data', () => {
            testSubject.setup(null);

            testSubject.trackMetric('metric1', 1);

            consoleMock.verify(c => c.log('[Metric] === metric1 - 1'), Times.once());
        });

        it('log data with base properties with circular reference', () => {
            const baseProps = { foo: 'bar' };
            (baseProps as any).y = baseProps;
            testSubject.setup(baseProps);

            testSubject.trackMetric('metric1', 1);

            consoleMock.verify(c => c.log(`[Metric][properties - ${util.inspect({ ...baseProps })}] === metric1 - 1`), Times.once());
        });
    });

    describe('trackEvent', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.trackEvent('metric1');
            }).toThrowError('ConsoleLoggerClient not setup');
        });

        it('log data without properties', () => {
            testSubject.setup(null);

            testSubject.trackEvent('event1');

            consoleMock.verify(c => c.log('[Event] === event1'), Times.once());
        });

        it('log data with base properties', () => {
            const baseProps = { foo: 'bar' };
            testSubject.setup(baseProps);

            testSubject.trackEvent('event1');

            consoleMock.verify(c => c.log(`[Event][properties - ${util.inspect(baseProps)}] === event1`), Times.once());
        });

        it('log data with event properties', () => {
            const baseProps = { foo: 'bar' };
            testSubject.setup(baseProps);
            const eventProps = { eventProp1: 'prop value' };

            testSubject.trackEvent('event1', eventProps);

            consoleMock.verify(
                c => c.log(`[Event][properties - ${util.inspect({ ...baseProps, ...eventProps })}] === event1`),
                Times.once(),
            );
        });
    });

    describe('log', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.log('trace', LogLevel.info);
            }).toThrowError('ConsoleLoggerClient not setup');
        });

        it('log data without properties', () => {
            testSubject.setup(null);

            testSubject.log('trace1', LogLevel.verbose);

            consoleMock.verify(c => c.log('[Trace][verbose] === trace1'), Times.once());
        });

        it('log data with base properties', () => {
            const baseProps = { foo: 'bar' };
            testSubject.setup(baseProps);

            testSubject.log('trace1', LogLevel.warn);

            consoleMock.verify(c => c.log(`[Trace][warn][properties - ${util.inspect(baseProps)}] === trace1`), Times.once());
        });

        it('log data with event properties', () => {
            const baseProps = { foo: 'bar' };
            testSubject.setup(baseProps);
            const traceProps = { eventProp1: 'prop value' };

            testSubject.log('trace1', LogLevel.warn, traceProps);

            consoleMock.verify(
                c => c.log(`[Trace][warn][properties - ${util.inspect({ ...baseProps, ...traceProps })}] === trace1`),
                Times.once(),
            );
        });
    });

    describe('trackException', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.trackException(new Error('error1'));
            }).toThrowError('ConsoleLoggerClient not setup');
        });

        it('log data without properties', () => {
            testSubject.setup(null);
            const error = new Error('error1');

            testSubject.trackException(error);

            consoleMock.verify(c => c.log(`[Exception] === ${util.inspect(error, { depth: null })}`), Times.once());
        });

        it('log data with base properties', () => {
            const baseProps = { foo: 'bar' };
            testSubject.setup(baseProps);
            const error = new Error('error1');

            testSubject.trackException(error);

            consoleMock.verify(
                c => c.log(`[Exception][properties - ${util.inspect(baseProps)}] === ${util.inspect(error, { depth: null })}`),
                Times.once(),
            );
        });
    });
});
