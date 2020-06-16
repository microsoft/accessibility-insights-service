// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ServiceConfiguration, TaskRuntimeConfig } from 'common';
import { DotenvConfigOutput } from 'dotenv';
import { Container } from 'inversify';
import * as _ from 'lodash';
import { BaseTelemetryProperties, GlobalLogger, loggerTypes } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { ProcessEntryPointBase } from './process-entry-point-base';
import { MockableLogger } from './test-utilities/mockable-logger';

// tslint:disable: no-unsafe-any no-any

class TestEntryPoint extends ProcessEntryPointBase {
    public baseTelemetryProperties: BaseTelemetryProperties = { source: 'test-source', someOtherProps: 'foo' };
    public customActionInvoked = false;
    public customActionArgs: any[];

    public customActionToBeInvoked: () => void;
    public taskConfig: TaskRuntimeConfig;

    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return this.baseTelemetryProperties;
    }

    protected async runCustomAction(container: Container, ...args: any[]): Promise<void> {
        if (!_.isNil(this.customActionToBeInvoked)) {
            this.customActionToBeInvoked();
        }
        this.customActionInvoked = true;
        this.customActionArgs = args;
    }
}

describe(ProcessEntryPointBase, () => {
    let testSubject: TestEntryPoint;
    let loggerMock: IMock<MockableLogger>;
    let dotEnvConfigStub: DotenvConfigOutput;
    let containerMock: IMock<Container>;
    let processMock: IMock<typeof process>;
    let taskConfig: TaskRuntimeConfig;
    let serviceConfig: IMock<ServiceConfiguration>;

    beforeEach(() => {
        loggerMock = Mock.ofType(MockableLogger);
        dotEnvConfigStub = {};
        containerMock = Mock.ofType(Container);
        processMock = Mock.ofInstance(process);
        taskConfig = {
            exitOnComplete: true,
            taskTimeoutInMinutes: 100,
            maxTaskRetryCount: 2,
            retentionTimeInDays: 3,
        };
        serviceConfig = Mock.ofType(ServiceConfiguration);
        serviceConfig.setup(async (s) => s.getConfigValue('taskConfig')).returns(async () => Promise.resolve(taskConfig));

        testSubject = new TestEntryPoint(containerMock.object);
        containerMock.setup((c) => c.get(loggerTypes.Process)).returns(() => processMock.object);
        containerMock.setup((c) => c.get(ServiceConfiguration)).returns(() => serviceConfig.object);
    });

    describe('start', () => {
        beforeEach(() => {
            loggerMock.setup((l) => l.logInfo('Exiting main process.')).verifiable(Times.once());
        });

        it('should not exit process', async () => {
            loggerMock.reset();
            taskConfig.exitOnComplete = false;
            const errorMsg = 'dotEnvLoadedFirst';
            containerMock
                .setup((c) => c.get(loggerTypes.DotEnvConfig))
                .returns(() => {
                    throw errorMsg;
                });
            containerMock
                .setup((c) => c.get(It.is((val) => val !== loggerTypes.DotEnvConfig && val !== loggerTypes.Process)))
                .verifiable(Times.never());
            loggerMock.reset();
            processMock.setup((p) => p.exit(It.isAny())).verifiable(Times.never());

            await expect(testSubject.start()).rejects.toEqual(errorMsg);

            expect(testSubject.customActionInvoked).toBe(false);
            verifyNoLoggingCalls(false);
            verifyLogFlushCall(Times.never());
            verifyMocks();
        });

        it('verifies dotenv is loaded first', async () => {
            loggerMock.reset();
            const errorMsg = 'dotEnvLoadedFirst';
            containerMock
                .setup((c) => c.get(loggerTypes.DotEnvConfig))
                .returns(() => {
                    throw errorMsg;
                });
            containerMock
                .setup((c) => c.get(It.is((val) => val !== loggerTypes.DotEnvConfig && val !== loggerTypes.Process)))
                .verifiable(Times.never());
            processMock.setup((p) => p.exit(It.isAny())).verifiable(Times.never());

            await expect(testSubject.start()).rejects.toEqual(errorMsg);

            expect(testSubject.customActionInvoked).toBe(false);
            verifyNoLoggingCalls(false);
            verifyLogFlushCall(Times.never());
            verifyMocks();
        });

        it('return log setup failure', async () => {
            loggerMock.reset();
            const errorMsg = 'logger setup error';
            setupContainerForDotEnvConfig();
            setupContainerForLogger();
            loggerMock.setup(async (l) => l.setup(testSubject.baseTelemetryProperties)).returns(async () => Promise.reject(errorMsg));
            setupVerifiableFailureProcessExit();

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

                loggerMock
                    .setup((l) =>
                        l.logInfo(
                            `Loaded environment variables from the .env config file.\n${JSON.stringify(
                                dotEnvConfigStub.parsed,
                                undefined,
                                2,
                            )}`,
                        ),
                    )
                    .verifiable();
                setupVerifiableSuccessProcessExit();

                await expect(testSubject.start()).resolves.toBeUndefined();

                verifyLogFlushCall();
                verifyMocks();
            });

            it('verifies logging for invalid data', async () => {
                dotEnvConfigStub = { error: new Error('error1') };

                loggerMock.setup((l) => l.logWarn(`Unable to load the .env config file. ${dotEnvConfigStub.error}`)).verifiable();
                setupVerifiableSuccessProcessExit();

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
                setupVerifiableSuccessProcessExit();
                processMock.setup((p) => p.exit(0)).verifiable(Times.once());

                await expect(testSubject.start()).resolves.toBeUndefined();

                expect(testSubject.customActionInvoked).toBe(true);

                verifyLogFlushCall();
                verifyMocks();
            });

            it('invoked when start is called with args', async () => {
                setupVerifiableSuccessProcessExit();
                await expect(testSubject.start(1, 2)).resolves.toBeUndefined();

                expect(testSubject.customActionInvoked).toBe(true);
                expect(testSubject.customActionArgs).toEqual([1, 2]);

                verifyLogFlushCall();
                verifyMocks();
            });

            it('logs exception thrown', async () => {
                setupVerifiableFailureProcessExit();

                const error = new Error('error in custom action');
                testSubject.customActionToBeInvoked = () => {
                    throw error;
                };
                loggerMock.setup((l) => l.logError('Error occurred while executing main process action.', It.isAny())).verifiable();

                await expect(testSubject.start()).rejects.toEqual(error);

                verifyLogFlushCall();
                verifyMocks();
            });
        });
    });

    function verifyMocks(): void {
        loggerMock.verifyAll();
        containerMock.verifyAll();
        processMock.verifyAll();
    }

    function setupVerifiableSuccessProcessExit(): void {
        processMock.setup((p) => p.exit(0)).verifiable(Times.once());
    }
    function setupVerifiableFailureProcessExit(): void {
        processMock.setup((p) => p.exit(1)).verifiable(Times.once());
    }

    function verifyNoLoggingCalls(hasLogger: boolean = true): void {
        loggerMock.verify((l) => l.log(It.isAny(), It.isAny(), It.isAny()), Times.never());
        if (hasLogger) {
            loggerMock.verify(
                (l) =>
                    l.logInfo(
                        It.is((s) => s !== 'Exiting main process.'),
                        It.isAny(),
                    ),
                Times.never(),
            );
        } else {
            loggerMock.verify((l) => l.logInfo(It.isAny(), It.isAny()), Times.never());
        }
        loggerMock.verify((l) => l.logVerbose(It.isAny(), It.isAny()), Times.never());
        loggerMock.verify((l) => l.trackEvent(It.isAny(), It.isAny()), Times.never());
        loggerMock.verify((l) => l.trackMetric(It.isAny(), It.isAny()), Times.never());
        loggerMock.verify((l) => l.logError(It.isAny(), It.isAny()), Times.never());
    }

    function verifyLogFlushCall(times: Times = Times.once()): void {
        loggerMock.verify((l) => l.flush(), times);
    }

    function setupContainerForDotEnvConfig(): void {
        containerMock
            .setup((c) => c.get(loggerTypes.DotEnvConfig))
            .returns(() => dotEnvConfigStub)
            .verifiable();
    }

    function setupContainerForLogger(): void {
        containerMock
            .setup((c) => c.get(GlobalLogger))
            .returns(() => loggerMock.object)
            .verifiable();
    }

    function setupLoggerSetupCall(): void {
        loggerMock
            .setup(async (l) => l.setup(testSubject.baseTelemetryProperties))
            .returns(async () => Promise.resolve())
            .verifiable();
    }
});
