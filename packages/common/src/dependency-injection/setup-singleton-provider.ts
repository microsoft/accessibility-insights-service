// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { interfaces } from 'inversify';
import { System } from '../system/system';

export namespace IoC {
    export function setupSingletonProvider<T>(
        key: string,
        container: interfaces.Container,
        factory: (context: interfaces.Context) => Promise<T>,
    ): void {
        let singletonInstancePromise: Promise<T>;

        container.bind(key).toProvider((context: interfaces.Context): (() => Promise<T>) => {
            return async () => {
                singletonInstancePromise = System.createInstanceIfNil(singletonInstancePromise, async () => {
                    return factory(context);
                });

                return singletonInstancePromise;
            };
        });
    }
}
