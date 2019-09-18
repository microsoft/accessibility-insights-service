// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable-next-line: no-any
export type Newable<T> = new (...args: any[]) => T;

export const webApiIocTypes = {
    azureFunctionContext: 'azureFunctionContext',
};
