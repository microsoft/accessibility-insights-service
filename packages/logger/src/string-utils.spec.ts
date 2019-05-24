// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { StringUtils } from './string-utils';
// tslint:disable: no-null-keyword

describe('StringUtils', () => {
    describe('isNullorEmpty', () => {
        test.each([null, undefined, ''])('returns true when for %o', testCase => {
            expect(StringUtils.isNullOrEmptyString(testCase)).toBe(true);
        });

        test.each(['val1', ' '])('returns false for non null value %o', testCase => {
            expect(StringUtils.isNullOrEmptyString(testCase)).toBe(false);
        });
    });
});
