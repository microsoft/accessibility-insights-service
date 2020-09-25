// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as crypto from 'crypto';
import * as utils from 'util';
import { isNil } from 'lodash';
import { serializeError as serializeErrorExt } from 'serialize-error';

/* eslint-disable @typescript-eslint/no-explicit-any */

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
        await new Promise((resolve) => setTimeout(resolve, timeoutMillisecond));
    }

    export function createRandomString(length: number = 32): string {
        const bytes = length % 2 === 0 ? length / 2 : (length + 1) / 2;

        return crypto.randomBytes(bytes).toString('hex').substr(0, length);
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    export function serializeError(error: any): string {
        return utils.inspect(serializeErrorExt(error), false, null);
    }
}
