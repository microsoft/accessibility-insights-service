// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import { addUniqueUrls } from './add-unique-urls';

describe(addUniqueUrls, () => {
    test('duplicates in given urls', () => {
        const old: string[] = ['abc', 'def'];
        const newUrls: string[] = ['abc', 'ghi'];
        const expected: string[] = ['abc', 'def', 'ghi'];
        expect(addUniqueUrls(old, newUrls)).toEqual(expected);
    });

    test('no duplicates', () => {
        const old: string[] = ['abc', 'def'];
        const newUrls: string[] = ['ghi'];
        const expected: string[] = ['abc', 'def', 'ghi'];
        expect(addUniqueUrls(old, newUrls)).toEqual(expected);
    });

    test('empty arrays', () => {
        const old: string[] = ['abc', 'def'];
        const newUrls: string[] = [];
        const expected: string[] = ['abc', 'def'];
        expect(addUniqueUrls(old, newUrls)).toEqual(expected);
        expect(addUniqueUrls(newUrls, old)).toEqual(expected);
        expect(addUniqueUrls([], [])).toEqual([]);
    });
});
