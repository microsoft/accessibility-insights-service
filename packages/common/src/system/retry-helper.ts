// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { System } from './system';

export type ErrorHandler = (error: Error) => Promise<void>;

async function defaultWaitFn(timeoutMsec: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, timeoutMsec));
}

@injectable()
export class RetryHelper<T> {
    public constructor(private readonly sleepFunction: (timeoutMsec: number) => Promise<void> = defaultWaitFn) {}

    public async executeWithRetries(
        action: () => Promise<T>,
        onRetry: ErrorHandler,
        maxRetryCount: number,
        retryIntervalMsec: number = 0,
    ): Promise<T> {
        let lastError: Error;
        for (let i = 0; i < maxRetryCount; i += 1) {
            try {
                return await action();
            } catch (error) {
                lastError =
                    error instanceof Error
                        ? error
                        : { name: 'RetryError', message: System.serializeError(error), stack: new Error().stack };

                if (i < maxRetryCount - 1) {
                    await onRetry(lastError);
                    if (retryIntervalMsec > 0) {
                        await this.sleepFunction(retryIntervalMsec * (i + 1));
                    }
                }
            }
        }

        throw lastError;
    }
}
