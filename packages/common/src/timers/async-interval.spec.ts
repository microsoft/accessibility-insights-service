// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';
import { AsyncInterval } from './async-interval';

describe(AsyncInterval, () => {
    let testSubject: AsyncInterval;

    beforeEach(() => {
        testSubject = new AsyncInterval();
    });

    it('executes the callback in interval till it returns false', async () => {
        let callCount = 0;
        const intervalTimeInMilliSec = 2;
        const expectedCallCount = 3;

        const callback = async () => {
            callCount += 1;
            const shouldExecuteAgain = callCount < expectedCallCount;

            return Promise.resolve(shouldExecuteAgain);
        };

        testSubject.setIntervalExecution(callback, intervalTimeInMilliSec);

        await waitForTimeout(100);
        expect(callCount).toBe(expectedCallCount);
    });

    it('executes the callback in interval even if callback fails', async () => {
        let callCount = 0;
        const intervalTimeInMilliSec = 3;
        const expectedCallCount = 3;

        const callback = async () => {
            callCount += 1;
            const shouldExecuteAgain = callCount < expectedCallCount;

            if (callCount === 1) {
                return Promise.reject();
            }

            return Promise.resolve(shouldExecuteAgain);
        };

        testSubject.setIntervalExecution(callback, intervalTimeInMilliSec);

        await waitForTimeout(100);

        expect(callCount).toBe(3);
    });

    async function waitForTimeout(timeoutValue: number): Promise<void> {
        return new Promise<void>(resolve => {
            setTimeout(() => {
                resolve();
            }, timeoutValue);
        });
    }
});
