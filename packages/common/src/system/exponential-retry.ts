// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { backOff, IBackOffOptions } from 'exponential-backoff';

export declare type ExponentialRetryOptions = Partial<IBackOffOptions>;

export const exponentialRetryOptions: ExponentialRetryOptions = {
    delayFirstAttempt: false,
    numOfAttempts: 5,
    maxDelay: 6000,
    startingDelay: 0,
    retry: () => true,
};

export async function executeWithExponentialRetry<T>(
    fn: () => Promise<T>,
    options: ExponentialRetryOptions = exponentialRetryOptions,
): Promise<T> {
    return backOff(async () => fn(), options);
}
