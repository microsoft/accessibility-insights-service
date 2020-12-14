// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { HashSet } from './hash-set';

let hashSet: HashSet<string>;

describe(HashSet, () => {
    beforeEach(() => {
        hashSet = new HashSet<string>();
    });

    it('add', () => {
        hashSet.add('key', 'value');
        expect(hashSet.get('key')).toEqual('value');
    });

    it('remove', () => {
        hashSet.add('key', 'value');
        expect(hashSet.remove('key')).toBeUndefined();
    });

    it('has', () => {
        expect(hashSet.has('key')).toBeFalsy();
        hashSet.add('key', 'value');
        expect(hashSet.has('key')).toBeTruthy();
    });

    it('keys', () => {
        hashSet.add('key1', 'value1');
        hashSet.add('key2', 'value2');
        expect(hashSet.keys()).toEqual(['key1', 'key2']);
    });

    it('values', () => {
        hashSet.add('key1', 'value1');
        hashSet.add('key2', 'value2');
        expect(hashSet.values()).toEqual(['value1', 'value2']);
    });

    it('next', () => {
        hashSet.add('key1', 'value1');
        hashSet.add('key2', 'value2');
        expect(hashSet.next()).toEqual({ done: false, value: 'value1' });
        expect(hashSet.next()).toEqual({ done: false, value: 'value2' });
        expect(hashSet.next()).toEqual({ done: true, value: undefined });
        expect(hashSet.next()).toEqual({ done: false, value: 'value1' });
    });

    it('iterator', () => {
        expect(hashSet[Symbol.iterator]()).toBe(hashSet);
    });

    it('serialize', () => {
        hashSet.add('key1', 'value1');
        hashSet.add('key2', 'value2');

        const json = JSON.stringify(hashSet);
        expect(json).toEqual(`{"key1":"value1","key2":"value2"}`);
    });
});
