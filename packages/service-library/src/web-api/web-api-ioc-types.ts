// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Newable<T> = new (...args: any[]) => T;

export const webApiIocTypes = {
    azureFunctionContext: 'azureFunctionContext',
};
