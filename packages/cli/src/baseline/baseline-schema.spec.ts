// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import Ajv from 'ajv';
import { BaselineSchemaValidator } from './baseline-schema';
import { BaselineResult } from './baseline-types';

describe(BaselineSchemaValidator, () => {
    let testSubject: BaselineSchemaValidator;

    beforeEach(() => {
        // This test is more valuable as an integration test that we're using Ajv correctly,
        // so we're using a real Ajv instance
        testSubject = new BaselineSchemaValidator(new Ajv({ allErrors: true }));
    });

    const validResult: BaselineResult = {
        cssSelector: 'css selector',
        htmlSnippet: '<span>html snippet</span>',
        rule: 'rule-id',
        urls: ['url-1', 'url-2'],
    };

    it.each`
        caseName | invalidValue
        ${'null'} | ${null}
        ${'undefined'} | ${undefined}
        ${'empty object'} | ${ {} }
        ${'non-object (string)'} | ${ 'string' }
        ${'non-object (number)'} | ${ 1 }
        ${'non-object (boolean)'} | ${ false }
        ${'missing metadata'} | ${ { results: [] } }
        ${'missing fileFormatVersion'} | ${ { metadata: { }, results: [] } }
        ${'unrecognized fileFormatVersion'} | ${ { metadata: { fileFormatVersion: '2' }, results: [] } }
        ${'missing cssSelector'} | ${ { metadata: { fileFormatVersion: '1' }, results: [{ ...validResult, cssSelector: undefined }] } }
        ${'missing htmlSnippet'} | ${ { metadata: { fileFormatVersion: '1' }, results: [{ ...validResult, htmlSnippet: undefined }] } }
        ${'missing rule'} | ${ { metadata: { fileFormatVersion: '1' }, results: [{ ...validResult, rule: undefined }] } }
        ${'missing urls'} | ${ { metadata: { fileFormatVersion: '1' }, results: [{ ...validResult, urls: undefined }] } }
    `('rejects invalid input ($caseName)', ({ invalidValue }) => {
        expect(() => testSubject.validate(invalidValue)).toThrow();
    });

    it.each`
        caseName | validValue
        ${'empty results'} | ${ { metadata: { fileFormatVersion: '1' }, results: [] } }
        ${'result without xpathSelector'} | ${ { metadata: { fileFormatVersion: '1' }, results: [{ ...validResult, xpathSelector: undefined }] } }
        ${'result with xpathSelector'} | ${ { metadata: { fileFormatVersion: '1' }, results: [{ ...validResult, xpathSelector: '/xpath' }] } }
        ${'multiple results'} | ${ { metadata: { fileFormatVersion: '1' }, results: [validResult, validResult, validResult] } }
    `('accepts valid input ($caseName)', ({validValue}) => {
        expect(testSubject.validate(validValue)).toBe(validValue);
    });
});
