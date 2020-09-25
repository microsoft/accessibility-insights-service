// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { WhyNodeRunningLogger } from './why-node-running-logger';

/* eslint-disable , @typescript-eslint/consistent-type-assertions, no-empty,@typescript-eslint/no-empty-function, @typescript-eslint/no-explicit-any */

type VoidFunction = () => void;

let wtfDumpMock: IMock<VoidFunction>;
jest.mock('wtfnode', () => {
    return {
        dump: () => {
            wtfDumpMock.object();
        },
    };
});

describe(WhyNodeRunningLogger, () => {
    let testSubject: WhyNodeRunningLogger;
    let setTimeoutMock: IMock<(callback: VoidFunction, ms: number) => void>;

    beforeEach(() => {
        wtfDumpMock = Mock.ofInstance(() => {}, MockBehavior.Strict);
        setTimeoutMock = Mock.ofInstance((callback: VoidFunction, ms: number) => {}, MockBehavior.Strict);

        const globalObjectStub = {
            setTimeout: setTimeoutMock.object,
        } as typeof global;

        testSubject = new WhyNodeRunningLogger(globalObjectStub);
    });

    afterEach(() => {
        wtfDumpMock.verifyAll();
        setTimeoutMock.verifyAll();
    });

    describe('log', () => {
        it('invokes wtfnode.dump', () => {
            wtfDumpMock.setup((s) => s()).verifiable(Times.once());
            testSubject.log();
        });
    });

    describe('logAfterSeconds', () => {
        it('should setup timeout', () => {
            const timeoutInSeconds = 5;
            setTimeoutMock.setup((s) => s(It.isAny(), timeoutInSeconds * 1000)).verifiable(Times.once());

            expect(testSubject.logAfterSeconds(timeoutInSeconds).then).toBeDefined();
        });

        it('invoke log after timeout', async () => {
            const timeoutInSeconds = 5;
            let timeoutCallback: VoidFunction;

            setTimeoutMock
                .setup((s) => s(It.isAny(), timeoutInSeconds * 1000))
                .callback((callback) => {
                    timeoutCallback = callback;
                });

            const logPromise = testSubject.logAfterSeconds(timeoutInSeconds);

            wtfDumpMock.setup((s) => s()).verifiable(Times.once());

            timeoutCallback();

            await logPromise;
        });
    });
});
