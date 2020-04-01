// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import { ErrorHandler, RetryHelper } from './retry-helper';

// tslint:disable: no-unsafe-any

describe(RetryHelper, () => {
    let testSubject: RetryHelper<number>;
    let errorHandlerMock: IMock<ErrorHandler>;
    let actionMock: IMock<() => Promise<number>>;
    let testError: Error;
    let sleepFunctionMock: IMock<(millis: number) => Promise<void>>;
    const maxAttempts = 3;
    const returnValue = 42;
    const millisBetweenRetries = 10;

    beforeEach(() => {
        errorHandlerMock = Mock.ofType<ErrorHandler>();
        actionMock = Mock.ofType<() => Promise<number>>();
        testError = new Error('test error');
        sleepFunctionMock = Mock.ofType<(millis: number) => Promise<void>>();
        testSubject = new RetryHelper(sleepFunctionMock.object);
    });

    afterEach(() => {
        errorHandlerMock.verifyAll();
        actionMock.verifyAll();
        sleepFunctionMock.verifyAll();
    });

    it('success on first try', async () => {
        actionMock
            .setup(a => a())
            .returns(async () => returnValue)
            .verifiable();
        errorHandlerMock.setup(e => e(It.isAny())).verifiable(Times.never());
        sleepFunctionMock.setup(s => s(It.isAny())).verifiable(Times.never());

        const result = await testSubject.executeWithRetries(actionMock.object, errorHandlerMock.object, maxAttempts, millisBetweenRetries);
        expect(result).toBe(returnValue);
    });

    it('success on retry', async () => {
        let retryCount = 0;
        actionMock
            .setup(a => a())
            .returns(async () => {
                if (retryCount < 2) {
                    retryCount += 1;
                    throw testError;
                }

                return returnValue;
            })
            .verifiable(Times.exactly(3));
        errorHandlerMock.setup(e => e(testError)).verifiable(Times.exactly(2));
        sleepFunctionMock.setup(s => s(millisBetweenRetries)).verifiable(Times.once());
        sleepFunctionMock.setup(s => s(millisBetweenRetries * 2)).verifiable(Times.once());

        const result = await testSubject.executeWithRetries(actionMock.object, errorHandlerMock.object, maxAttempts, millisBetweenRetries);
        expect(result).toBe(returnValue);
    });

    it('all retries fail', async () => {
        actionMock
            .setup(a => a())
            .throws(testError)
            .verifiable(Times.exactly(maxAttempts));
        errorHandlerMock.setup(e => e(It.isAny())).verifiable(Times.exactly(maxAttempts - 1));
        sleepFunctionMock.setup(s => s(It.isAny())).verifiable(Times.exactly(maxAttempts - 1));

        let thrownError: Error;
        await testSubject.executeWithRetries(actionMock.object, errorHandlerMock.object, maxAttempts, millisBetweenRetries).catch(err => {
            thrownError = err;
        });
        expect(thrownError).toBe(testError);
    });

    it('does not call sleepFunction if millisBetweenRetries is 0', async () => {
        actionMock
            .setup(a => a())
            .throws(testError)
            .verifiable(Times.exactly(maxAttempts));
        sleepFunctionMock.setup(s => s(It.isAny())).verifiable(Times.never());

        await testSubject.executeWithRetries(actionMock.object, errorHandlerMock.object, maxAttempts).catch(err => {
            return;
        });
    });
});
