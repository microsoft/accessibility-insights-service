// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { interfaces } from 'inversify';
import { createInstanceIfNil } from './create-instance-if-nil';

export function setupSingletonProvider<T>(
    key: string,
    container: interfaces.Container,
    factory: (context: interfaces.Context) => Promise<T>,
): void {
    let singletonInstancePromise: Promise<T>;

    container.bind(key).toProvider(
        (context: interfaces.Context): (() => Promise<T>) => {
            return async () => {
                singletonInstancePromise = createInstanceIfNil(singletonInstancePromise, async () => {
                    return factory(context);
                });

                return singletonInstancePromise;
            };
        },
    );
}
