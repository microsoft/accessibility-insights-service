// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { WhyNodeRunningLogger } from './why-node-running-logger';

// tslint:disable: no-unsafe-any no-object-literal-type-assertion no-empty no-any

let wtfDumpMock: IMock<Function>;
jest.mock('wtfnode', () => {
    return {
        dump: () => {
            wtfDumpMock.object();
        },
    };
});

describe(WhyNodeRunningLogger, () => {
    let testSubject: WhyNodeRunningLogger;
    const intervalInMiliSec = 100;
    let setIntervalMock: IMock<(callback: Function, ms: number) => NodeJS.Timeout>;
    let clearIntervalMock: IMock<(intervalId: NodeJS.Timeout) => void>;
    let setTimeoutMock: IMock<(callback: Function, ms: number) => void>;

    beforeEach(() => {
        wtfDumpMock = Mock.ofInstance(() => {}, MockBehavior.Strict);
        setIntervalMock = Mock.ofInstance((callback: Function, ms: number) => {
            return undefined;
        }, MockBehavior.Strict);
        setTimeoutMock = Mock.ofInstance((callback: Function, ms: number) => {}, MockBehavior.Strict);
        clearIntervalMock = Mock.ofInstance((intervalId: NodeJS.Timeout) => {}, MockBehavior.Strict);

        const globalObjectStub = {
            setInterval: setIntervalMock.object,
            clearInterval: clearIntervalMock.object,
            setTimeout: setTimeoutMock.object,
        } as typeof global;

        testSubject = new WhyNodeRunningLogger(intervalInMiliSec, globalObjectStub);
    });

    afterEach(() => {
        wtfDumpMock.verifyAll();
        setIntervalMock.verifyAll();
        clearIntervalMock.verifyAll();
    });

    describe('logNow', () => {
        it('invokes wtfnode.dump', () => {
            wtfDumpMock.setup(s => s()).verifiable(Times.once());
            WhyNodeRunningLogger.LOGNOW();
        });
    });

    describe('start', () => {
        it('should start only once', () => {
            const intervalId = 'interval id' as any;
            setIntervalMock
                .setup(s => s(It.isAny(), intervalInMiliSec))
                .returns(() => intervalId)
                .verifiable(Times.once());

            testSubject.start();
            testSubject.start();
        });

        it('invoke wtfnode on interval', () => {
            let setIntervalCallback: Function;
            setIntervalMock
                .setup(s => s(It.isAny(), intervalInMiliSec))
                .callback(callback => {
                    setIntervalCallback = callback;
                });
            testSubject.start();

            wtfDumpMock.setup(s => s()).verifiable(Times.once());

            setIntervalCallback();
        });
    });

    describe('stop', () => {
        it('do nothing if not started', () => {
            clearIntervalMock.setup(c => c(It.isAny())).verifiable(Times.never());
            testSubject.stop();
        });

        it('should stop only once', () => {
            const intervalId = 'interval id' as any;
            setIntervalMock
                .setup(s => s(It.isAny(), intervalInMiliSec))
                .returns(() => intervalId)
                .verifiable(Times.once());
            clearIntervalMock.setup(c => c(intervalId)).verifiable(Times.once());

            testSubject.start();

            wtfDumpMock.setup(s => s()).verifiable(Times.once());
            testSubject.stop();
            testSubject.stop();
        });
    });

    describe('stopAfterSeconds', () => {
        it('should setup timeout', () => {
            const timeoutInSeconds = 5;
            setTimeoutMock.setup(s => s(It.isAny(), timeoutInSeconds * 1000)).verifiable(Times.once());

            testSubject.stopAfterSeconds(timeoutInSeconds);
        });

        it('invoke stop after timeout', () => {
            const intervalId = 'interval id' as any;
            const timeoutInSeconds = 5;
            let timeoutCallback: Function;

            setIntervalMock
                .setup(s => s(It.isAny(), intervalInMiliSec))
                .returns(() => intervalId)
                .verifiable(Times.once());
            testSubject.start();

            setTimeoutMock
                .setup(s => s(It.isAny(), timeoutInSeconds * 1000))
                .callback(callback => {
                    timeoutCallback = callback;
                });

            testSubject.stopAfterSeconds(timeoutInSeconds);

            clearIntervalMock.setup(c => c(intervalId)).verifiable(Times.once());
            wtfDumpMock.setup(s => s()).verifiable(Times.once());

            timeoutCallback();
        });
    });
});
