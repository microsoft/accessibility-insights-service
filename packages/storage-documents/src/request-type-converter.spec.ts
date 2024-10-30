// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { convertToBrowserValidationResult, convertToBrowserValidationTypes } from './request-type-converter';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(convertToBrowserValidationResult, () => {
    it('convert from empty request', () => {
        expect(convertToBrowserValidationResult(undefined)).toEqual(undefined);
        expect(convertToBrowserValidationResult([] as any)).toEqual(undefined);
        expect(convertToBrowserValidationResult([''] as any)).toEqual(undefined);
    });

    it('convert from request with unknown types', () => {
        expect(convertToBrowserValidationResult(['unknown'] as any)).toEqual(undefined);
        expect(convertToBrowserValidationResult(['unknown', 'highContrastProperties'] as any)).toEqual({
            highContrastProperties: 'pending',
        });
    });

    it('convert from highContrastProperties request', () => {
        expect(convertToBrowserValidationResult(['highContrastProperties'])).toEqual({ highContrastProperties: 'pending' });
    });
});

describe(convertToBrowserValidationTypes, () => {
    it('convert from empty result', () => {
        expect(convertToBrowserValidationTypes(undefined)).toEqual(undefined);
        expect(convertToBrowserValidationTypes({})).toEqual(undefined);
    });

    it('convert from result with unknown definition', () => {
        expect(convertToBrowserValidationTypes({ unknown: {} } as any)).toEqual(undefined);
        expect(convertToBrowserValidationTypes({ unknown: {}, highContrastProperties: 'pending' } as any)).toEqual([
            'highContrastProperties',
        ]);
    });

    it('convert from result with highContrastProperties definition', () => {
        expect(convertToBrowserValidationTypes({ highContrastProperties: 'pending' })).toEqual(['highContrastProperties']);
        expect(convertToBrowserValidationTypes({ highContrastProperties: 'pass' })).toEqual(['highContrastProperties']);
    });
});
