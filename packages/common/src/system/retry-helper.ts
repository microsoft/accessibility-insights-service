// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';

export type ErrorHandler = (error: Error) => Promise<void>;

async function defaultSleepFunction(milliseconds: number): Promise<void> {
    // tslint:disable-next-line: no-string-based-set-timeout
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

@injectable()
export class RetryHelper<T> {
    public constructor(private readonly sleepFunction: (msecs: number) => Promise<void> = defaultSleepFunction) {}

    public async executeWithRetries(
        action: () => Promise<T>,
        onRetry: ErrorHandler,
        maxRetryCount: number,
        retryIntervalMilliseconds: number = 0,
    ): Promise<T> {
        let lastError: Error;
        for (let i = 0; i < maxRetryCount; i += 1) {
            try {
                return await action();
            } catch (error) {
                lastError =
                    error instanceof Error ? error : { name: 'RetryError', message: JSON.stringify(error), stack: new Error().stack };

                if (i < maxRetryCount - 1) {
                    await onRetry(lastError);
                    if (retryIntervalMilliseconds > 0) {
                        await this.sleepFunction(retryIntervalMilliseconds * (i + 1));
                    }
                }
            }
        }

        throw lastError;
    }
}
