// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { UrlLocationValidator } from './url-location-validator';

let urlLocationValidator: UrlLocationValidator;

describe(UrlLocationValidator, () => {
    beforeEach(() => {
        urlLocationValidator = new UrlLocationValidator();
    });

    it('Empty Url is not allowed', () => {
        expect(urlLocationValidator.allowed('')).toEqual(false);
    });

    it('Url without path is allowed', () => {
        expect(urlLocationValidator.allowed('http://localhost')).toEqual(true);
    });

    it('Url with path is allowed', () => {
        expect(urlLocationValidator.allowed('http://localhost/path')).toEqual(true);
    });

    it('Url with known type is not allowed', () => {
        expect(urlLocationValidator.allowed('http://localhost/path/image.png')).toEqual(false);
    });

    it('Url with known type is not allowed', () => {
        expect(urlLocationValidator.allowed('http://localhost/image.png')).toEqual(false);
    });
});
