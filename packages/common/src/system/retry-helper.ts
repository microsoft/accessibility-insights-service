// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type ErrorHandler = (err: Error) => Promise<void>;

export class RetryHelper<T> {
    public async executeWithRetries(action: () => Promise<T>, onRetry: ErrorHandler, maxAttempts: number): Promise<T> {
        let lastError: Error;
        for (let i = 0; i < maxAttempts; i += 1) {
            try {
                return await action();
            } catch (err) {
                lastError = err as Error;
                if (i < maxAttempts - 1) {
                    await onRetry(lastError);
                }
            }
        }
        throw lastError;
    }
}
