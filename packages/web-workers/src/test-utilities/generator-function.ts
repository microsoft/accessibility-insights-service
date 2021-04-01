// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function* generatorStub<YieldType, ReturnType, NextType = unknown>(
    returnValue?: ReturnType,
): Generator<YieldType, ReturnType, NextType> {
    yield undefined;

    return returnValue;
}
