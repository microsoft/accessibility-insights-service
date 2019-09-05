// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Url } from './url';

// tslint:disable: no-http-string

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
});
