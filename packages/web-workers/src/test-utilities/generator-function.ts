// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function* generatorStub<YieldType, ReturnType, NextType = unknown>(
    callback: () => void = () => null,
    returnValue?: ReturnType,
): Generator<YieldType, ReturnType, NextType> {
    yield undefined;
    callback();

    return returnValue;
}

export function* errorGeneratorStub<YieldType, ReturnType, NextType = unknown>(error: Error): Generator<YieldType, ReturnType, NextType> {
    yield undefined;
    throw error;
}
