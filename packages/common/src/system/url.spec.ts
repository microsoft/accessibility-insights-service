// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Url } from './url';

describe('tryParseUrlString()', () => {
    it('validate url string', () => {
        let url = Url.tryParseUrlString('abc/path/');
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
});
