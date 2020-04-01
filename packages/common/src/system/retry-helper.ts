// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';

export type ErrorHandler = (err: Error) => Promise<void>;

async function defaultSleepFunction(milliseconds: number): Promise<void> {
    // tslint:disable-next-line: no-string-based-set-timeout
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

@injectable()
export class RetryHelper<T> {
    public constructor(private readonly sleepFunction: (millis: number) => Promise<void> = defaultSleepFunction) {}

    public async executeWithRetries(
        action: () => Promise<T>,
        onRetry: ErrorHandler,
        maxAttempts: number,
        millisBetweenRetries: number = 0,
    ): Promise<T> {
        let lastError: Error;
        for (let i = 0; i < maxAttempts; i += 1) {
            try {
                return await action();
            } catch (err) {
                lastError = err as Error;
                if (i < maxAttempts - 1) {
                    await onRetry(lastError);
                    if (millisBetweenRetries > 0) {
                        await this.sleepFunction(millisBetweenRetries * (i + 1));
                    }
                }
            }
        }
        throw lastError;
    }
}
