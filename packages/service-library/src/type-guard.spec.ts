// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';
import {
    checkPrimitiveProperty,
    checkLiteralProperty,
    checkPrimitiveArrayProperty,
    checkObjectProperties,
    checkObject,
    checkObjectArray,
    ObjectOptions,
} from './type-guard';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const propTypes = ['type1', 'type2', 'type3'] as const;
export declare type PropType = (typeof propTypes)[number];

describe('type-guard', () => {
    test.each([undefined, {}, { prop: undefined }, { prop: 1 }])('checkPrimitiveProperty() for %o', (obj: any) => {
        expect(checkPrimitiveProperty(obj, 'prop', 'string')).toEqual(false);
    });
    test.each([undefined, {}])('checkPrimitiveProperty() for %o', (obj: any) => {
        expect(checkPrimitiveProperty(obj, 'prop', 'string', true)).toEqual(true);
    });
    test.each([{ prop: 'prop' }])('checkPrimitiveProperty() for %o', (obj: any) => {
        expect(checkPrimitiveProperty(obj, 'prop', 'string')).toEqual(true);
    });

    test.each([undefined, {}, { prop: undefined }, { prop: 1 }, { prop: 'nan' }])('checkLiteralProperty() for %o', (obj: any) => {
        expect(checkLiteralProperty(obj, 'prop', propTypes as any)).toEqual(false);
    });
    test.each([undefined, {}])('checkLiteralProperty() for %o', (obj: any) => {
        expect(checkLiteralProperty(obj, 'prop', propTypes as any, true)).toEqual(true);
    });
    test.each([{ prop: 'type1' }])('checkLiteralProperty() for %o', (obj: any) => {
        expect(checkLiteralProperty(obj, 'prop', propTypes as any)).toEqual(true);
    });

    test.each([undefined, {}, { prop: undefined }, { prop: [1, 2, 3] }])('checkPrimitiveArrayProperty() for %o', (obj: any) => {
        expect(checkPrimitiveArrayProperty(obj, 'prop', 'string')).toEqual(false);
    });
    test.each([undefined, {}, { prop: [] }])('checkPrimitiveArrayProperty() for %o', (obj: any) => {
        expect(checkPrimitiveArrayProperty(obj, 'prop', 'string', true)).toEqual(true);
    });
    test.each([{ prop: ['prop1', 'prop2', 'prop3'] }])('checkPrimitiveArrayProperty() for %o', (obj: any) => {
        expect(checkPrimitiveArrayProperty(obj, 'prop', 'string')).toEqual(true);
    });

    test.each([undefined, {}, { prim: undefined }, { prim: 'string', lit: undefined }, { prim: 'string', lit: 'type1', arr: undefined }])(
        'checkObjectProperties() for %o',
        (obj: any) => {
            const options = {
                primitives: [['prim', 'string']],
                literals: [['lit', propTypes as any]],
                arrays: [['arr', 'string']],
            } as ObjectOptions;

            expect(checkObjectProperties(obj, options)).toEqual(false);
        },
    );
    test.each([{ prim: 'string', lit: 'type1', arr: ['arr1'] }])('checkObjectProperties() for %o', (obj: any) => {
        const options = {
            primitives: [['prim', 'string']],
            literals: [['lit', propTypes as any]],
            arrays: [['arr', 'string']],
        } as ObjectOptions;

        expect(checkObjectProperties(obj, options)).toEqual(true);
    });
    test.each([{ prim: 'string' }, { lit: 'type1' }, { arr: ['arr1'] }])('checkObjectProperties() for %o', (obj: any) => {
        const options = {
            primitives: [['prim', 'string', true]],
            literals: [['lit', propTypes as any, true]],
            arrays: [['arr', 'string', true]],
        } as ObjectOptions;

        expect(checkObjectProperties(obj, options)).toEqual(true);
    });

    test.each([undefined, 'nan', {}])('checkObject() for %o', (obj: any) => {
        const options = {
            primitives: [['prim', 'string']],
        } as ObjectOptions;

        expect(checkObject(obj, options)).toEqual(false);
    });
    test.each([{}, { prim: 'string' }])('checkObject() for %o', (obj: any) => {
        const options = {
            primitives: [['prim', 'string', true]],
        } as ObjectOptions;

        expect(checkObject(obj, options)).toEqual(true);
    });

    test.each([undefined, 'nan', [{}]])('checkObjectArray() for %o', (obj: any) => {
        const options = {
            primitives: [['prim', 'string']],
        } as ObjectOptions;

        expect(checkObjectArray(obj, options)).toEqual(false);
    });
    test.each([{ o: [] }, { o: [{ prim: 'string' }] }])('checkObjectArray() for %o', (obj: any) => {
        const options = {
            primitives: [['prim', 'string', true]],
        } as ObjectOptions;

        expect(checkObjectArray(obj.o, options)).toEqual(true);
    });
});
