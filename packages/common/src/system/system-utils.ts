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

    export function chunkArray<T>(sourceArray: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let index = 0; index < sourceArray.length; index += chunkSize) {
            chunks.push(sourceArray.slice(index, index + chunkSize));
        }

        return chunks;
    }

    export async function wait(timeoutMillisecond: number): Promise<void> {
        // tslint:disable-next-line: no-string-based-set-timeout
        await new Promise(resolve => setTimeout(resolve, timeoutMillisecond));
    }
}
