// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { isNil } from 'lodash';

export namespace System {
    export function createInstanceIfNil<T>(instance: T, factory: () => T): T {
        if (isNil(instance)) {
            return factory();
        }

        return instance;
    }

    export function isNullOrEmptyString(str: string): boolean {
        return isNil(str) || str.length === 0;
    }
}
