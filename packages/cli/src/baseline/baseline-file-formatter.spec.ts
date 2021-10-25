// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock } from 'typemoq';
import { BaselineFileContent } from './baseline-types';
import { BaselineFileFormatter } from './baseline-file-formatter';
import { BaselineSchemaValidator } from './baseline-schema';

describe(BaselineFileFormatter, () => {
    const validInputObject: BaselineFileContent = {
        metadata: { fileFormatVersion: '1' },
        results: [
            {
                cssSelector: 'css-selector-1',
                htmlSnippet: '<div id="1" />',
                rule: 'rule-1',
                urls: ['url-1-a', 'url-1-b'],
            },
            {
                cssSelector: 'css-selector-2',
                htmlSnippet: `<div id="2">
newline!
</div>`,
                rule: 'rule-2',
                urls: ['url-2-a'],
                xpathSelector: '/xpath/selector/2',
            },
        ],
    };

    const validInputFile: string = `{
  metadata: {
    fileFormatVersion: '1',
  },
  results: [
    {
      cssSelector: 'css-selector-1',
      htmlSnippet: '<div id="1" />',
      rule: 'rule-1',
      urls: [
        'url-1-a',
        'url-1-b',
      ],
    },
    {
      cssSelector: 'css-selector-2',
      htmlSnippet: '<div id="2">\\nnewline!\\n</div>',
      rule: 'rule-2',
      urls: [
        'url-2-a',
      ],
      xpathSelector: '/xpath/selector/2',
    },
  ],
}`;

    let mockBaselineSchemaValidator: IMock<BaselineSchemaValidator>;
    let testSubject: BaselineFileFormatter;

    beforeEach(() => {
        mockBaselineSchemaValidator = Mock.ofType<BaselineSchemaValidator>();
        mockBaselineSchemaValidator.setup((m) => m.validate(It.isAny())).returns((x) => x);

        // This test is more valuable as an integration test with json5, so we're
        // using real instances of them.
        testSubject = new BaselineFileFormatter(mockBaselineSchemaValidator.object);
    });

    describe('format', () => {
        it('produces the exact pinned output for a valid input object', () => {
            expect(testSubject.format(validInputObject)).toStrictEqual(validInputFile);
        });
    });

    describe('parse', () => {
        it('propagates schema validation errors', () => {
            const validationError = new Error('from BaselineSchemaValidator');
            mockBaselineSchemaValidator.reset();
            mockBaselineSchemaValidator.setup((m) => m.validate(It.isAny())).throws(validationError);

            expect(() => testSubject.parse(validInputFile)).toThrowError(validationError);
        });

        it('emits an Error if given a file which is not valid JSON5', () => {
            expect(() => testSubject.parse('{{}')).toThrowErrorMatchingInlineSnapshot(`"JSON5: invalid character '{' at 1:2"`);
        });

        it('correctly parses a valid v1 file', () => {
            expect(testSubject.parse(validInputFile)).toStrictEqual(validInputObject);
        });
    });

    it('can round-trip a valid object without changes', () => {
        expect(testSubject.parse(testSubject.format(validInputObject))).toStrictEqual(validInputObject);
    });

    it('can round-trip a valid file without changes', () => {
        expect(testSubject.format(testSubject.parse(validInputFile))).toStrictEqual(validInputFile);
    });
});
