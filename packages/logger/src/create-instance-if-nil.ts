// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { isNil } from 'lodash';

export function createInstanceIfNil<T>(instance: T, factory: () => T): T {
    if (isNil(instance)) {
        return factory();
    }

    return instance;
}
