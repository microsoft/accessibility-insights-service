// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { convertKnownPageToString, convertObjectToKnownPages, convertStringToKnownPage } from './type-converter';
import { KnownPage } from './website-scan-result';

describe('KnownPage type converter', () => {
    test('convert to string', () => {
        let knownPage = {} as KnownPage;
        let value = convertKnownPageToString(knownPage);
        expect('').toEqual(value);

        knownPage = { url: 'url1' } as KnownPage;
        value = convertKnownPageToString(knownPage);
        expect(value).toEqual('url1');

        knownPage = { url: 'url2', scanId: 'scanId' } as KnownPage;
        value = convertKnownPageToString(knownPage);
        expect(value).toEqual('url2|scanId');

        knownPage = { url: 'url3', scanState: 'pass' } as KnownPage;
        value = convertKnownPageToString(knownPage);
        expect(value).toEqual('url3|||pass');

        knownPage = { url: 'url4', scanId: 'scanId', runState: 'completed', scanState: 'pass' } as KnownPage;
        value = convertKnownPageToString(knownPage);
        expect(value).toEqual('url4|scanId|completed|pass');
    });

    test('convert to object', () => {
        let value = '';
        let knownPage = convertStringToKnownPage(value);
        expect(knownPage).toBeUndefined();

        value = 'url1|scanId|completed|pass';
        knownPage = convertStringToKnownPage(value);
        let expected = { url: 'url1', scanId: 'scanId', runState: 'completed', scanState: 'pass' } as KnownPage;
        expect(knownPage).toEqual(expected);

        value = 'url2|||pass';
        knownPage = convertStringToKnownPage(value);
        expected = { url: 'url2', scanState: 'pass' } as KnownPage;
        expect(knownPage).toEqual(expected);
    });

    test('convert to list', () => {
        let knownPagesObj = {};
        let knownPages = convertObjectToKnownPages(knownPagesObj);
        expect(knownPages).toEqual([]);

        knownPagesObj = {
            hash1: 'url1',
            hash2: 'url2',
        };
        const expected = [
            {
                url: 'url1',
            },
            {
                url: 'url2',
            },
        ];
        knownPages = convertObjectToKnownPages(knownPagesObj);
        expect(knownPages).toEqual(expected);
    });
});
