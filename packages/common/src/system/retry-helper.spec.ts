// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import { ErrorHandler, RetryHelper } from './retry-helper';

describe(RetryHelper, () => {
    let testSubject: RetryHelper<number>;
    let errorHandlerMock: IMock<ErrorHandler>;
    let actionMock: IMock<() => Promise<number>>;
    let testError: Error;
    let sleepFunctionMock: IMock<(ms: number) => Promise<void>>;
    const maxAttempts = 3;
    const returnValue = 42;
    const retryIntervalMilliseconds = 10;

    beforeEach(() => {
        errorHandlerMock = Mock.ofType<ErrorHandler>();
        actionMock = Mock.ofType<() => Promise<number>>();
        testError = new Error('test error');
        sleepFunctionMock = Mock.ofType<(ms: number) => Promise<void>>();
        testSubject = new RetryHelper(sleepFunctionMock.object);
    });

    afterEach(() => {
        errorHandlerMock.verifyAll();
        actionMock.verifyAll();
        sleepFunctionMock.verifyAll();
    });

    it('success on first try', async () => {
        actionMock
            .setup(async (a) => a())
            .returns(async () => returnValue)
            .verifiable();
        errorHandlerMock.setup(async (e) => e(It.isAny())).verifiable(Times.never());
        sleepFunctionMock.setup(async (s) => s(It.isAny())).verifiable(Times.never());

        const result = await testSubject.executeWithRetries(
            actionMock.object,
            errorHandlerMock.object,
            maxAttempts,
            retryIntervalMilliseconds,
        );
        expect(result).toBe(returnValue);
    });

    it('success on retry', async () => {
        let retryCount = 0;
        actionMock
            .setup(async (a) => a())
            .returns(async () => {
                if (retryCount < 2) {
                    retryCount += 1;
                    throw testError;
                }

                return returnValue;
            })
            .verifiable(Times.exactly(3));
        errorHandlerMock.setup(async (e) => e(testError)).verifiable(Times.exactly(2));
        sleepFunctionMock.setup(async (s) => s(retryIntervalMilliseconds)).verifiable(Times.once());
        sleepFunctionMock.setup(async (s) => s(retryIntervalMilliseconds * 2)).verifiable(Times.once());

        const result = await testSubject.executeWithRetries(
            actionMock.object,
            errorHandlerMock.object,
            maxAttempts,
            retryIntervalMilliseconds,
        );
        expect(result).toBe(returnValue);
    });

    it('all retries fail', async () => {
        actionMock
            .setup(async (a) => a())
            .throws(testError)
            .verifiable(Times.exactly(maxAttempts));
        errorHandlerMock.setup(async (e) => e(It.isAny())).verifiable(Times.exactly(maxAttempts - 1));
        sleepFunctionMock.setup(async (s) => s(It.isAny())).verifiable(Times.exactly(maxAttempts - 1));

        let thrownError: Error;
        await testSubject
            .executeWithRetries(actionMock.object, errorHandlerMock.object, maxAttempts, retryIntervalMilliseconds)
            .catch((error) => {
                thrownError = error;
            });
        expect(thrownError).toBe(testError);
    });

    it('does not call sleep function if retryIntervalMilliseconds is 0', async () => {
        actionMock
            .setup(async (a) => a())
            .throws(testError)
            .verifiable(Times.exactly(maxAttempts));
        sleepFunctionMock.setup(async (s) => s(It.isAny())).verifiable(Times.never());

        await testSubject.executeWithRetries(actionMock.object, errorHandlerMock.object, maxAttempts).catch((error) => {
            return;
        });
    });

    it('convert error type', async () => {
        const testErrorObj = { message: 'other error type' };
        actionMock
            .setup(async (a) => a())
            .returns(() => {
                throw testErrorObj;
            })
            .verifiable(Times.exactly(maxAttempts));
        errorHandlerMock.setup(async (e) => e(It.isAny())).verifiable(Times.exactly(maxAttempts - 1));
        sleepFunctionMock.setup(async (s) => s(It.isAny())).verifiable(Times.exactly(maxAttempts - 1));

        let thrownError: Error;
        await testSubject
            .executeWithRetries(actionMock.object, errorHandlerMock.object, maxAttempts, retryIntervalMilliseconds)
            .catch((error) => {
                thrownError = error;
            });

        const expectedError = { name: 'RetryError', message: JSON.stringify(testErrorObj), stack: '' };
        expect(thrownError.stack).toBeDefined();
        thrownError.stack = '';
        expect(thrownError).toEqual(expectedError);
    });
});
