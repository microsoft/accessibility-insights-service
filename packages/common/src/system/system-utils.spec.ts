// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

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

describe('isNullOrEmptyString', () => {
    // tslint:disable-next-line: no-null-keyword
    test.each([null, undefined, ''])('returns true when for %o', testCase => {
        expect(System.isNullOrEmptyString(testCase)).toBe(true);
    });

    test.each(['val1', ' '])('returns false for non null value %o', testCase => {
        expect(System.isNullOrEmptyString(testCase)).toBe(false);
    });
});

describe('chunkArray()', () => {
    it('chunk array', () => {
        const sourceArray = [1, 2, 3, 4, 5, 6, 7];
        const result = System.chunkArray(sourceArray, 3);
        expect(result.length).toEqual(3);
        expect(result[0]).toEqual([1, 2, 3]);
        expect(result[1]).toEqual([4, 5, 6]);
        expect(result[2]).toEqual([7]);
    });
});

describe('createRandomString()', () => {
    it('create random string', () => {
        let id = System.createRandomString(33);
        expect(id.length).toEqual(33);

        id = System.createRandomString();
        expect(id.length).toEqual(32);
    });
});

describe('createGuid()', () => {
    it('create new UUID', () => {
        const guid = System.createGuid();
        expect(guid.length).toEqual(36);
        expect(guid.substr(13, 2)).toEqual('-6');
    });
});

describe('getGuidTimestamp()', () => {
    it('get creation timestamp of UUID', () => {
        const timestamp = System.getGuidTimestamp('1e9ce66b-fb58-6080-1a9d-ed3459ab8b4f').valueOf();
        expect(timestamp).toEqual(1567527630984);
    });
});
