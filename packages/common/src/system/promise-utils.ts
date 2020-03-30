// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';

@injectable()
export class PromiseUtils {
    constructor(private readonly globalObj = global) {}

    public async waitFor<T, Y>(promise: Promise<T>, timeoutInMilliSec: number, onTimeoutCallback: () => Promise<Y>): Promise<T | Y> {
        let timeoutHandle: NodeJS.Timeout;
        let hasTimedOut = false;

        const timeoutPromise = new Promise<Y>((resolve, reject) => {
            timeoutHandle = this.globalObj.setTimeout(() => {
                hasTimedOut = true;
                resolve();
            }, timeoutInMilliSec);
        });

        const racePromise = Promise.race([promise, timeoutPromise]);

        try {
            await racePromise;
        } finally {
            this.globalObj.clearTimeout(timeoutHandle);
        }

        if (hasTimedOut) {
            return onTimeoutCallback();
        }

        return promise;
    }
}
