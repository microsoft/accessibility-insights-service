// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { System } from './system-utils';

describe('create instance if nil', () => {
    // tslint:disable-next-line: no-null-keyword
    test.each([null, undefined])('creates instance when nil - %o', testCase => {
        expect(
            System.createInstanceIfNil(testCase, () => {
                return 1;
            }),
        ).toBe(1);
    });

    it('does not create instance when not nil', async () => {
        expect(
            System.createInstanceIfNil(1, () => {
                return 10;
            }),
        ).toBe(1);
    });

    it('returns promise when factory returns promise', async () => {
        const promise = Promise.resolve(1);
        // tslint:disable-next-line: no-floating-promises
        await expect(
            // tslint:disable-next-line: no-null-keyword
            System.createInstanceIfNil(null, async () => {
                return promise;
            }),
        ).resolves.toBe(1);
    });

    it('returns promise when passed instance is promise object', async () => {
        const promise = Promise.resolve(1);
        // tslint:disable-next-line: no-floating-promises
        expect(
            // tslint:disable-next-line: no-null-keyword
            System.createInstanceIfNil(promise, async () => {
                return Promise.resolve(10);
            }),
        ).resolves.toBe(1);
    });
});

describe('StringUtils', () => {
    describe('isNullOrEmpty', () => {
        // tslint:disable-next-line: no-null-keyword
        test.each([null, undefined, ''])('returns true when for %o', testCase => {
            expect(System.isNullOrEmptyString(testCase)).toBe(true);
        });

        test.each(['val1', ' '])('returns false for non null value %o', testCase => {
            expect(System.isNullOrEmptyString(testCase)).toBe(false);
        });
    });
});
