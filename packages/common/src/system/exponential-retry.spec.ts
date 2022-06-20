// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { IBackOffOptions } from 'exponential-backoff';
import { executeWithExponentialRetry } from './exponential-retry';

let options: Partial<IBackOffOptions>;

describe(executeWithExponentialRetry, () => {
    beforeEach(() => {
        options = {
            delayFirstAttempt: false,
            numOfAttempts: 3,
            maxDelay: 100,
            startingDelay: 0,
            retry: () => true,
        };
    });

    it('invoke without retry', async () => {
        const fn = jest.fn().mockImplementation(async () => Promise.resolve(true));
        const actualResult = await executeWithExponentialRetry(fn, options);
        expect(actualResult).toEqual(true);
        expect(fn).toBeCalledTimes(1);
    });

    it('invoke with retry', async () => {
        const fn = jest.fn().mockImplementation(async () => {
            throw new Error('error');
        });
        await expect(executeWithExponentialRetry(fn, options)).rejects.toThrowError(/error/);
        expect(fn).toBeCalledTimes(3);
    });
});
