// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as utils from 'util';
import { serializeError as serializeErrorExt } from 'serialize-error';
import { System } from './system';

/* eslint-disable @typescript-eslint/no-floating-promises */

describe('create instance if nil', () => {
    test.each([null, undefined])('creates instance when nil - %o', (testCase) => {
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
        await expect(
            System.createInstanceIfNil(null, async () => {
                return promise;
            }),
        ).resolves.toBe(1);
    });

    it('returns promise when passed instance is promise object', async () => {
        const promise = Promise.resolve(1);
        expect(
            System.createInstanceIfNil(promise, async () => {
                return Promise.resolve(10);
            }),
        ).resolves.toBe(1);
    });
});

describe('isNullOrEmptyString', () => {
    test.each([null, undefined, ''])('returns true when for %o', (testCase) => {
        expect(System.isNullOrEmptyString(testCase)).toBe(true);
    });

    test.each(['val1', ' '])('returns false for non null value %o', (testCase) => {
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

describe('serializeError()', () => {
    it('serialize error object', () => {
        const error = new Error('Error message');
        const errorStr = System.serializeError(error);
        expect(errorStr).toEqual(utils.inspect(serializeErrorExt(error), false, null));
    });
});
