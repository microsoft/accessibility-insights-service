// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable, optional } from 'inversify';

@injectable()
export class PromiseUtils {
    constructor(@optional() @inject('global') private readonly globalObj = global) {}

    public async waitFor<T, Y>(fn: Promise<T>, timeoutInMsec: number, onTimeoutCallback: () => Promise<Y>): Promise<T | Y> {
        let timeoutHandle: NodeJS.Timeout;
        let hasTimedOut = false;

        const timeoutPromise = new Promise<void>((resolve) => {
            timeoutHandle = this.globalObj.setTimeout(() => {
                hasTimedOut = true;
                resolve();
            }, timeoutInMsec);
        });

        const racePromise = Promise.race([fn, timeoutPromise]);

        try {
            await racePromise;
        } finally {
            this.globalObj.clearTimeout(timeoutHandle);
        }

        if (hasTimedOut) {
            return onTimeoutCallback();
        }

        return fn;
    }
}
