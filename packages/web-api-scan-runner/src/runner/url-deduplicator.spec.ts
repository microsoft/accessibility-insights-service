// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import { UrlDeduplicator } from './url-deduplicator';

describe(UrlDeduplicator, () => {
    let testSubject: UrlDeduplicator;
    beforeEach(() => {
        testSubject = new UrlDeduplicator();
    });

    test('duplicates in given urls', () => {
        const old: string[] = ['abc', 'def'];
        const newUrls: string[] = ['abc', 'ghi'];
        const expected: string[] = ['abc', 'def', 'ghi'];
        expect(testSubject.dedupe(old, newUrls)).toEqual(expected);
    });

    test('no dupelicates', () => {
        const old: string[] = ['abc', 'def'];
        const newUrls: string[] = ['ghi'];
        const expected: string[] = ['abc', 'def', 'ghi'];
        expect(testSubject.dedupe(old, newUrls)).toEqual(expected);
    });

    test('empty arrays', () => {
        const old: string[] = ['abc', 'def'];
        const newUrls: string[] = [];
        const expected: string[] = ['abc', 'def'];
        expect(testSubject.dedupe(old, newUrls)).toEqual(expected);
        expect(testSubject.dedupe(newUrls, old)).toEqual(expected);
        expect(testSubject.dedupe([], [])).toEqual([]);
    });
});
