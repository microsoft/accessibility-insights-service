import 'reflect-metadata';

import * as _ from 'lodash';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { VError } from 'verror';
import { ConsoleLoggerClient } from './console-logger-client';
import { Logger, LogLevel } from './logger';
import { LoggerClient } from './logger-client';

// tslint:disable: no-null-keyword no-object-literal-type-assertion no-any no-void-expression

describe(Logger, () => {
    let loggerClient1Mock: IMock<LoggerClient>;
    let loggerClient2Mock: IMock<LoggerClient>;
    let testSubject: Logger;
    let processStub: typeof process;

    beforeEach(() => {
        processStub = { execArgv: ['--test'] } as typeof process;
        loggerClient1Mock = Mock.ofType2(ConsoleLoggerClient, null, MockBehavior.Strict);
        loggerClient2Mock = Mock.ofType2(ConsoleLoggerClient, null, MockBehavior.Strict);

        testSubject = new Logger([loggerClient1Mock.object, loggerClient2Mock.object], processStub);
    });

    describe('setup', () => {
        it('verify default setup', () => {
            setupCallsForTelemetrySetup();

            testSubject.setup();

            verifyMocks();
        });

        it('does not initialize more than once', () => {
            const baseProps = { foo: 'bar' };

            setupCallsForTelemetrySetup(baseProps);

            testSubject.setup(baseProps);
            testSubject.setup(baseProps);

            verifyMocks();
        });

        it('initializes with additional common properties', () => {
            const baseProps = { foo: 'bar' };

            setupCallsForTelemetrySetup(baseProps);

            testSubject.setup(baseProps);

            verifyMocks();
        });
    });

    describe('trackMetric', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.trackMetric('metric1', 1);
            }).toThrowError('Logger not setup');
        });

        it('when value not passed', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m => m.setup(c => c.trackMetric('metric1', 1)).verifiable(Times.once()));

            testSubject.trackMetric('metric1');

            verifyMocks();
        });

        it('when value passed', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m => m.setup(c => c.trackMetric('metric1', 10)).verifiable(Times.once()));

            testSubject.trackMetric('metric1', 10);

            verifyMocks();
        });
    });

    describe('trackEvent', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.trackEvent('event1', { foo: 'bar' });
            }).toThrowError('Logger not setup');
        });

        it('when properties not passed', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m => m.setup(c => c.trackEvent('event1', undefined)).verifiable(Times.once()));

            testSubject.trackEvent('event1');

            verifyMocks();
        });

        it('when properties passed', () => {
            const properties = { foo: 'bar' };
            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m => m.setup(c => c.trackEvent('event1', properties)).verifiable(Times.once()));

            testSubject.trackEvent('event1', properties);

            verifyMocks();
        });
    });

    describe('log', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.log('trace1', LogLevel.warn);
            }).toThrowError('Logger not setup');
        });

        it('when properties not passed', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m => m.setup(c => c.log('trace1', LogLevel.error, undefined)).verifiable(Times.once()));

            testSubject.log('trace1', LogLevel.error);

            verifyMocks();
        });

        it('when properties passed', () => {
            const properties = { foo: 'bar' };
            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m => m.setup(c => c.log('trace1', LogLevel.error, properties)).verifiable(Times.once()));

            testSubject.log('trace1', LogLevel.error, properties);

            verifyMocks();
        });
    });

    describe('logInfo', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.logInfo('info1');
            }).toThrowError('Logger not setup');
        });

        it('when properties not passed', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m => m.setup(c => c.log('info1', LogLevel.info, undefined)).verifiable(Times.once()));

            testSubject.logInfo('info1');

            verifyMocks();
        });

        it('when properties passed', () => {
            const properties = { foo: 'bar' };
            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m => m.setup(c => c.log('info1', LogLevel.info, properties)).verifiable(Times.once()));

            testSubject.logInfo('info1', properties);

            verifyMocks();
        });
    });

    describe('logWarn', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.logWarn('warn1');
            }).toThrowError('Logger not setup');
        });

        it('when properties not passed', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m => m.setup(c => c.log('warn1', LogLevel.warn, undefined)).verifiable(Times.once()));

            testSubject.logWarn('warn1');

            verifyMocks();
        });

        it('when properties passed', () => {
            const properties = { foo: 'bar' };
            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m => m.setup(c => c.log('warn1', LogLevel.warn, properties)).verifiable(Times.once()));

            testSubject.logWarn('warn1', properties);

            verifyMocks();
        });
    });

    describe('logError', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.logError('error1');
            }).toThrowError('Logger not setup');
        });

        it('when properties not passed', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m => m.setup(c => c.log('error1', LogLevel.error, undefined)).verifiable(Times.once()));

            testSubject.logError('error1');

            verifyMocks();
        });

        it('when properties passed', () => {
            const properties = { foo: 'bar' };
            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m => m.setup(c => c.log('error1', LogLevel.error, properties)).verifiable(Times.once()));

            testSubject.logError('error1', properties);

            verifyMocks();
        });
    });

    describe('logVerbose', () => {
        it('--debug is case insensitive', () => {
            processStub.execArgv = ['--t', '--DEBUG'];
            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m => m.setup(c => c.log('event1', LogLevel.verbose, undefined)).verifiable(Times.once()));

            testSubject.logVerbose('event1');

            verifyMocks();
        });

        describe('in debug mode', () => {
            beforeEach(() => {
                processStub.execArgv = ['--t', '--debug'];

                setupCallsForTelemetrySetup();
                testSubject.setup();
            });

            it('when properties not passed', () => {
                invokeAllLoggerClientMocks(m => m.setup(c => c.log('event1', LogLevel.verbose, undefined)).verifiable(Times.once()));

                testSubject.logVerbose('event1');

                verifyMocks();
            });

            it('when properties passed', () => {
                const properties = { foo: 'bar' };

                invokeAllLoggerClientMocks(m => m.setup(c => c.log('event1', LogLevel.verbose, properties)).verifiable(Times.once()));

                testSubject.logVerbose('event1', properties);

                verifyMocks();
            });
        });

        describe('in normal mode', () => {
            it('when properties not passed', () => {
                testSubject.logVerbose('event1');

                verifyMocks();
            });

            it('when properties passed', () => {
                const properties = { foo: 'bar' };
                testSubject.logVerbose('event1', properties);

                verifyMocks();
            });
        });
    });

    describe('trackException', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.trackException(new Error('test error'));
            }).toThrowError('Logger not setup');
        });

        it('trackException', () => {
            const error = new Error('some error');
            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m => m.setup(c => c.trackException(error)).verifiable(Times.once()));

            testSubject.trackException(error);

            verifyMocks();
        });
    });

    describe('trackExceptionAny', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.trackExceptionAny(new Error('test error'), 'error message');
            }).toThrowError('Logger not setup');
        });

        it('handles when passed error object', () => {
            const underlyingError = new Error('internal error');
            const errorMessage = 'error message';

            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m =>
                m.setup(c => c.trackException(new VError(underlyingError, errorMessage))).verifiable(Times.once()),
            );

            testSubject.trackExceptionAny(underlyingError, errorMessage);

            verifyMocks();
        });

        it('handles when passed non-error object', () => {
            const underlyingError = 'internal error';
            const errorMessage = 'error message';

            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m =>
                m.setup(c => c.trackException(new VError({ info: { error: underlyingError } }, errorMessage))).verifiable(Times.once()),
            );

            testSubject.trackExceptionAny(underlyingError, errorMessage);

            verifyMocks();
        });
    });

    describe('flush', () => {
        it('throw if called before setup', () => {
            expect(() => {
                testSubject.flush();
            }).toThrowError('Logger not setup');
        });

        it('flushes events', () => {
            setupCallsForTelemetrySetup();
            testSubject.setup();

            invokeAllLoggerClientMocks(m => m.setup(c => c.flush()).verifiable(Times.once()));

            testSubject.flush();
        });
    });

    function verifyMocks(): void {
        loggerClient1Mock.verifyAll();
        loggerClient2Mock.verifyAll();
    }

    function setupCallsForTelemetrySetup(additionalCommonProps?: { [key: string]: string }): void {
        invokeAllLoggerClientMocks(m => m.setup(c => c.setup(additionalCommonProps)).verifiable(Times.once()));
    }

    function invokeAllLoggerClientMocks(action: (loggerClient: IMock<LoggerClient>) => void): void {
        action(loggerClient1Mock);
        action(loggerClient2Mock);
    }
});
