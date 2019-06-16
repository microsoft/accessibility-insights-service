// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-unsafe-any
import 'reflect-metadata';

import { DotenvConfigOutput } from 'dotenv';
import { Container } from 'inversify';
import * as _ from 'lodash';
import { BaseTelemetryProperties, Logger, loggerTypes } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { ProcessEntryPointBase } from './process-entry-point-base';

describe(ProcessEntryPointBase, () => {
    class TestEntryPoint extends ProcessEntryPointBase {
        public baseTelemetryProperties: BaseTelemetryProperties = { source: 'test-source', someOtherProps: 'foo' };
        public customActionInvoked = false;

        public customActionToBeInvoked: () => void;

        protected getTelemetryBaseProperties(): BaseTelemetryProperties {
            return this.baseTelemetryProperties;
        }

        protected async runCustomAction(): Promise<void> {
            if (!_.isNil(this.customActionToBeInvoked)) {
                this.customActionToBeInvoked();
            }
            this.customActionInvoked = true;
        }
    }

    let testSubject: TestEntryPoint;
    let loggerMock: IMock<Logger>;
    let dotEnvConfigStub: DotenvConfigOutput;
    let containerMock: IMock<Container>;

    beforeEach(() => {
        loggerMock = Mock.ofType(Logger);
        dotEnvConfigStub = {};
        containerMock = Mock.ofType(Container);

        testSubject = new TestEntryPoint(containerMock.object);
    });

    describe('start', () => {
        it('verifies dotenv is loaded first', async () => {
            const errorMsg = 'dotEnvLoadedFirst';
            containerMock
                .setup(c => c.get(loggerTypes.DotEnvConfig))
                .returns(() => {
                    throw errorMsg;
                });
            containerMock.setup(c => c.get(It.is(val => val !== loggerTypes.DotEnvConfig))).verifiable(Times.never());

            await expect(testSubject.start()).rejects.toEqual(errorMsg);

            expect(testSubject.customActionInvoked).toBe(false);
            verifyNoLoggingCalls();
            verifyLogFlushCall(Times.never());
            verifyMocks();
        });

        it('return log setup failure', async () => {
            const errorMsg = 'logger setup error';
            setupContainerForDotEnvConfig();
            setupContainerForLogger();
            loggerMock
                .setup(l => l.setup(testSubject.baseTelemetryProperties))
                .returns(() => {
                    throw errorMsg;
                });

            await expect(testSubject.start()).rejects.toEqual(errorMsg);
            verifyNoLoggingCalls();
            verifyLogFlushCall(Times.never());
            verifyMocks();
        });

        describe('logging for dotEnvConfig', () => {
            beforeEach(() => {
                setupContainerForDotEnvConfig();
                setupContainerForLogger();
                setupLoggerSetupCall();
            });

            it('verifies logging for valid data', async () => {
                dotEnvConfigStub = { parsed: { foo: 'bar' } };

                loggerMock.setup(l => l.logInfo('Config based environment variables:')).verifiable();
                loggerMock.setup(l => l.logInfo(JSON.stringify(dotEnvConfigStub.parsed, undefined, 2))).verifiable();

                await expect(testSubject.start()).resolves.toBeUndefined();

                verifyLogFlushCall();
                verifyMocks();
            });

            it('verifies logging for invalid data', async () => {
                dotEnvConfigStub = { error: new Error('error1') };

                loggerMock.setup(l => l.logWarn(`Unable to load env config file. ${dotEnvConfigStub.error}`)).verifiable();

                await expect(testSubject.start()).resolves.toBeUndefined();

                verifyLogFlushCall();
                verifyMocks();
            });
        });

        describe('runCustomAction', () => {
            beforeEach(() => {
                setupContainerForDotEnvConfig();
                setupContainerForLogger();
                setupLoggerSetupCall();
                dotEnvConfigStub = { parsed: { foo: 'bar' } };
            });

            it('invoked when start is called', async () => {
                await expect(testSubject.start()).resolves.toBeUndefined();

                expect(testSubject.customActionInvoked).toBe(true);

                verifyLogFlushCall();
                verifyMocks();
            });

            it('logs exception thrown', async () => {
                const error = new Error('error in custom action');
                testSubject.customActionToBeInvoked = () => {
                    throw error;
                };
                loggerMock.setup(l => l.trackExceptionAny(error, 'Error occurred while executing job')).verifiable();

                await expect(testSubject.start()).rejects.toEqual(error);

                verifyLogFlushCall();
                verifyMocks();
            });
        });
    });

    function verifyMocks(): void {
        loggerMock.verifyAll();
        containerMock.verifyAll();
    }

    function verifyNoLoggingCalls(): void {
        loggerMock.verify(l => l.log(It.isAny(), It.isAny(), It.isAny()), Times.never());
        loggerMock.verify(l => l.logInfo(It.isAny(), It.isAny()), Times.never());
        loggerMock.verify(l => l.logVerbose(It.isAny(), It.isAny()), Times.never());
        loggerMock.verify(l => l.trackEvent(It.isAny(), It.isAny()), Times.never());
        loggerMock.verify(l => l.trackMetric(It.isAny(), It.isAny()), Times.never());
        loggerMock.verify(l => l.trackException(It.isAny()), Times.never());
        loggerMock.verify(l => l.trackExceptionAny(It.isAny(), It.isAny()), Times.never());
    }

    function verifyLogFlushCall(times: Times = Times.once()): void {
        loggerMock.verify(l => l.flush(), times);
    }

    function setupContainerForDotEnvConfig(): void {
        containerMock
            .setup(c => c.get(loggerTypes.DotEnvConfig))
            .returns(() => dotEnvConfigStub)
            .verifiable();
    }

    function setupContainerForLogger(): void {
        containerMock
            .setup(c => c.get(Logger))
            .returns(() => loggerMock.object)
            .verifiable();
    }

    function setupLoggerSetupCall(): void {
        loggerMock.setup(l => l.setup(testSubject.baseTelemetryProperties)).verifiable();
    }
});
