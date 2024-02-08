// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Url } from './url';

describe('tryParseUrlString()', () => {
    it('normalizeUrl', () => {
        let url = Url.normalizeUrl('https://example.com/home/');
        expect(url).toEqual('https://example.com/home');

        // remove hash
        url = Url.normalizeUrl('https://example.com/#top');
        expect(url).toEqual('https://example.com');

        // remove hash
        url = Url.normalizeUrl('https://example.com/#top',false);
        expect(url).toEqual('https://example.com');

        // do not remove hash
        url = Url.normalizeUrl('https://example.com/#top',true);
        expect(url).toEqual('https://example.com/#top');

        // keep and sort query parameters
        url = Url.normalizeUrl('https://example.com?b=two&a=one&c=three');
        expect(url).toEqual('https://example.com/?a=one&b=two&c=three');
    });

    it('hasQueryParameters', async () => {
        const url1 = 'www.bla.com?p=v';
        const url2 = 'www.bla.com';

        expect(Url.hasQueryParameters(url1)).toStrictEqual(true);
        expect(Url.hasQueryParameters(url2)).toStrictEqual(false);
    });
});
