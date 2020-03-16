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
    const maxAttempts = 3;
    const returnValue = 42;

    beforeEach(() => {
        errorHandlerMock = Mock.ofType<ErrorHandler>();
        actionMock = Mock.ofType<() => Promise<number>>();
        testError = new Error('test error');
        testSubject = new RetryHelper();
    });

    afterEach(() => {
        errorHandlerMock.verifyAll();
        actionMock.verifyAll();
    });

    it('success on first try', async () => {
        actionMock
            .setup(a => a())
            .returns(async () => returnValue)
            .verifiable();
        errorHandlerMock.setup(e => e(It.isAny())).verifiable(Times.never());

        const result = await testSubject.executeWithRetries(actionMock.object, errorHandlerMock.object, maxAttempts);
        expect(result).toBe(returnValue);
    });

    it('success on retry', async () => {
        let retried = false;
        actionMock
            .setup(a => a())
            .returns(async () => {
                if (!retried) {
                    retried = true;
                    throw testError;
                }

                return returnValue;
            })
            .verifiable(Times.exactly(2));
        errorHandlerMock.setup(e => e(testError)).verifiable(Times.once());

        const result = await testSubject.executeWithRetries(actionMock.object, errorHandlerMock.object, maxAttempts);
        expect(result).toBe(returnValue);
    });

    it('all retries fail', async () => {
        actionMock
            .setup(a => a())
            .throws(testError)
            .verifiable(Times.exactly(maxAttempts));
        errorHandlerMock.setup(e => e(It.isAny())).verifiable(Times.exactly(maxAttempts - 1));

        let thrownError: Error;
        await testSubject.executeWithRetries(actionMock.object, errorHandlerMock.object, maxAttempts).catch(err => {
            thrownError = err;
        });
        expect(thrownError).toBe(testError);
    });
});
