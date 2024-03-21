// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock } from 'typemoq';
import { HashGenerator } from 'common';
import { KnownPageTypeConverter } from './known-page-type-converter';
import { KnownPage } from './website-scan-result';

/* eslint-disable @typescript-eslint/no-explicit-any */

let hashGeneratorMock: IMock<HashGenerator>;
let knownPageTypeConverter: KnownPageTypeConverter;

describe(KnownPageTypeConverter, () => {
    beforeEach(() => {
        hashGeneratorMock = Mock.ofType<HashGenerator>();
        hashGeneratorMock.setup((o) => o.generateBase64Hash128(It.isAny())).returns((s) => `hash_${s}`);

        knownPageTypeConverter = new KnownPageTypeConverter(hashGeneratorMock.object);
    });

    afterEach(() => {
        hashGeneratorMock.verifyAll();
    });

    test('convert to string', () => {
        let knownPage = {} as KnownPage;
        let value = knownPageTypeConverter.convertKnownPageToString(knownPage);
        expect('').toEqual(value);

        knownPage = { url: 'url1' } as KnownPage;
        value = knownPageTypeConverter.convertKnownPageToString(knownPage);
        expect(value).toEqual('url1');

        knownPage = { url: 'url2', scanId: 'scanId' } as KnownPage;
        value = knownPageTypeConverter.convertKnownPageToString(knownPage);
        expect(value).toEqual('url2|scanId');

        knownPage = { url: 'url3', scanState: 'pass' } as KnownPage;
        value = knownPageTypeConverter.convertKnownPageToString(knownPage);
        expect(value).toEqual('url3|||pass');

        knownPage = { url: 'url4', scanId: 'scanId', runState: 'completed', scanState: 'pass' } as KnownPage;
        value = knownPageTypeConverter.convertKnownPageToString(knownPage);
        expect(value).toEqual('url4|scanId|completed|pass');
    });

    test('convert to object', () => {
        let value = '';
        let knownPage = knownPageTypeConverter.convertStringToKnownPage(value);
        expect(knownPage).toBeUndefined();

        value = 'url1|scanId|completed|pass';
        knownPage = knownPageTypeConverter.convertStringToKnownPage(value);
        let expected = { url: 'url1', scanId: 'scanId', runState: 'completed', scanState: 'pass' } as KnownPage;
        expect(knownPage).toEqual(expected);

        value = 'url2|||pass';
        knownPage = knownPageTypeConverter.convertStringToKnownPage(value);
        expected = { url: 'url2', scanState: 'pass' } as KnownPage;
        expect(knownPage).toEqual(expected);
    });

    test('convert object to list', () => {
        let knownPagesObj = {};
        let knownPages = knownPageTypeConverter.convertObjectToKnownPages(knownPagesObj);
        expect(knownPages).toEqual([]);

        knownPages = knownPageTypeConverter.convertObjectToKnownPages(undefined);
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
        knownPages = knownPageTypeConverter.convertObjectToKnownPages(knownPagesObj);
        expect(knownPages).toEqual(expected);
    });

    test('convert list to object', () => {
        const knownPages = [
            {
                url: 'url1',
            },
            {
                url: 'url2',
            },
        ];
        const expected = {
            hash_url1: 'url1',
            hash_url2: 'url2',
        };
        let knownPagesObj = knownPageTypeConverter.convertKnownPagesToObject(knownPages);
        expect(knownPagesObj).toEqual(expected);

        knownPagesObj = knownPageTypeConverter.convertKnownPagesToObject([]);
        expect(knownPagesObj).toEqual({});

        knownPagesObj = knownPageTypeConverter.convertKnownPagesToObject(undefined);
        expect(knownPagesObj).toEqual({});
    });
});
