// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Url } from './url';

describe('tryParseUrlString()', () => {
    it('validate url string', () => {
        let url = Url.tryParseUrlString('abc/path/');
        expect(url).toEqual(undefined);

        url = Url.tryParseUrlString('/abc/path/');
        expect(url).toEqual(undefined);

        url = Url.tryParseUrlString('abc/path/', false);
        expect(url.href).toEqual('abc/path/');

        url = Url.tryParseUrlString('{a: b}');
        expect(url).toEqual(undefined);

        url = Url.tryParseUrlString('http://abc/path/');
        expect(url.href).toEqual('http://abc/path/');

        url = Url.tryParseUrlString('https://abc/');
        expect(url.href).toEqual('https://abc/');
    });

    it('getRootUrl', async () => {
        const url1 = 'www.bla.com/a/b/';
        const url2 = 'www.bla.com/a/b/c';

        expect(Url.getRootUrl(url1)).toStrictEqual(Url.getRootUrl(url2));
    });

    it('hasQueryParameters', async () => {
        const url1 = 'www.bla.com?p=v';
        const url2 = 'www.bla.com';

        expect(Url.hasQueryParameters(url1)).toStrictEqual(true);
        expect(Url.hasQueryParameters(url2)).toStrictEqual(false);
    });

    it('normalizeUrl', () => {
        // keep single slash
        let url = Url.normalizeUrl('https://example.com/');
        expect(url).toEqual('https://example.com/');

        // keep trailing slash
        url = Url.normalizeUrl('https://example.com/home/');
        expect(url).toEqual('https://example.com/home/');

        // remove hash
        url = Url.normalizeUrl('https://example.com/home#top');
        expect(url).toEqual('https://example.com/home');

        // sort query parameters
        url = Url.normalizeUrl('https://example.com?b=two&a=one&c=three');
        expect(url).toEqual('https://example.com/?a=one&b=two&c=three');

        // keep www
        url = Url.normalizeUrl('https://www.example.com/');
        expect(url).toEqual('https://www.example.com/');
    });

    it('getParameterValue', () => {
        let parameterValue = Url.getParameterValue('a', 'https://example.com?b=two&a=one&c=three');
        expect(parameterValue).toEqual('one');

        parameterValue = Url.getParameterValue('none', 'https://example.com?b=two&a=one&c=three');
        expect(parameterValue).toBeUndefined();
    });

    it('getAbsoluteUrl', () => {
        let absoluteUrl = Url.getAbsoluteUrl('/en-us', 'https://localhost.com/');
        expect(absoluteUrl).toEqual('https://localhost.com/en-us');

        absoluteUrl = Url.getAbsoluteUrl('https://localhost.com/en-us', 'https://localhost.com/');
        expect(absoluteUrl).toEqual('https://localhost.com/en-us');

        absoluteUrl = Url.getAbsoluteUrl('https://localhost3.com/en-us', 'https://localhost2.com/');
        expect(absoluteUrl).toEqual('https://localhost3.com/en-us');
    });
});
