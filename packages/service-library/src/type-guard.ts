// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isPlainObject } from 'lodash';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ObjectOptions {
    primitives?: [string, string, boolean?][];
    literals?: [string, any, boolean?][];
    arrays?: [string, string, boolean?][];
}

export const checkPrimitiveProperty = (obj: any, propName: string, propType: string, optional: boolean = false) => {
    const checker = () => typeof obj[propName] === propType;

    return optional ? (obj !== undefined && propName in obj ? checker() : true) : obj !== undefined && propName in obj && checker();
};

export const checkLiteralProperty = (obj: any, propName: string, propValues: string[], optional: boolean = false) => {
    const checker = () => propValues.find((value) => value === obj[propName]) !== undefined;

    return optional ? (obj !== undefined && propName in obj ? checker() : true) : obj !== undefined && propName in obj && checker();
};

export const checkPrimitiveArrayProperty = (obj: any, propName: string, arrayElementType: string, optional: boolean = false) => {
    const checker = () => Array.isArray(obj[propName]) && obj[propName].every((item) => typeof item === arrayElementType);

    return optional ? (obj !== undefined && propName in obj ? checker() : true) : obj !== undefined && propName in obj && checker();
};

export const checkObjectProperties = (obj: any, options: ObjectOptions) => {
    const primitiveTest = options.primitives
        ? options.primitives.every((prop) => checkPrimitiveProperty(obj, prop[0], prop[1], prop[2]) === true)
        : true;
    const literalTest = options.literals
        ? options.literals.every((prop) => checkLiteralProperty(obj, prop[0] as string, prop[1], prop[2]) === true)
        : true;
    const arrayTest = options.arrays
        ? options.arrays.every((prop) => checkPrimitiveArrayProperty(obj, prop[0], prop[1], prop[2]) === true)
        : true;

    return primitiveTest && literalTest && arrayTest;
};

export const checkObject = (obj: any, options: ObjectOptions) =>
    obj !== undefined && isPlainObject(obj) && checkObjectProperties(obj, options);

export const checkObjectArray = (obj: any, options: ObjectOptions) => {
    const checker = (item: any) => checkObject(item, options);

    return obj !== undefined && Array.isArray(obj) && obj.every(checker);
};
