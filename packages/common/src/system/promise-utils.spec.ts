// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import { PromiseUtils } from './promise-utils';

describe(PromiseUtils, () => {
    let testSubject: PromiseUtils;

    beforeEach(() => {
        testSubject = new PromiseUtils();
    });

    describe('waitFor', () => {
        it('returns resolved promise', async () => {
            const resolvedValue = 'resolved promise value';

            const promise = new Promise<string>((resolve) => {
                resolve(resolvedValue);
            });

            const startTime = +new Date();
            const result = await testSubject.waitFor(promise, 10000, async () => Promise.resolve('timed out value'));

            expect(result).toBe(resolvedValue);
            expect(+new Date() - startTime).toBeLessThan(1000);
        });

        it('returns rejected promise', async () => {
            const rejectedValue = 'rejected promise value';
            let exceptionThrown = false;

            const promise = new Promise<string>((resolve, reject) => {
                reject(rejectedValue);
            });

            const startTime = +new Date();
            try {
                await testSubject.waitFor(promise, 10000, async () => Promise.resolve('timed out value'));
            } catch (error) {
                exceptionThrown = true;
                expect(error).toBe(rejectedValue);
            }

            expect(exceptionThrown).toBe(true);
            expect(+new Date() - startTime).toBeLessThan(1000);
        });

        it('returns resolved timed out promise', async () => {
            const timeoutValue = 'timed out value';

            // eslint-disable-next-line , no-empty,@typescript-eslint/no-empty-function
            const promise = new Promise<string>(() => {});

            const result = await testSubject.waitFor(promise, 10, async () => Promise.resolve(timeoutValue));

            expect(result).toBe(timeoutValue);
        });

        it('returns rejected timed out promise', async () => {
            let resolvePromise: () => void;
            const timeoutValue = 'timed out value';
            let exceptionThrown = false;

            const promise = new Promise<string>((resolve) => {
                resolvePromise = resolve;
            });

            try {
                await testSubject.waitFor(promise, 10, async () => Promise.reject(timeoutValue));
            } catch (error) {
                exceptionThrown = true;
                resolvePromise();
                expect(error).toBe(timeoutValue);
            }

            expect(exceptionThrown).toBe(true);
        });
    });
});
