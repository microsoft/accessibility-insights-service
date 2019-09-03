// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as crypto from 'crypto';
import { isNil } from 'lodash';
// @ts-ignore
import * as uuid from 'uuid-with-v6';

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

    export function createRandomString(length: number = 32): string {
        const bytes = length % 2 === 0 ? length / 2 : (length + 1) / 2;

        return crypto
            .randomBytes(bytes)
            .toString('hex')
            .substr(0, length);
    }

    export function createGuid(): string {
        // tslint:disable-next-line: no-unsafe-any
        return uuid.v6();
    }

    export function getGuidTimestamp(guid: string): Date {
        if ((guid.length === 36 && guid.substr(14, 1) !== '6') || (guid.length === 32 && guid.substr(12, 1) !== '6')) {
            throw new Error('Only version 6 of UUID is supported.');
        }

        const timestampMilliseconds = BigInt(`0x${guid.substr(0, 8)}${guid.substr(9, 4)}${guid.substr(15, 3)}`) / 10000n;
        const baseDate = BigInt(Math.abs(new Date(Date.UTC(1582, 9, 15)).valueOf()));

        return new Date(Number(timestampMilliseconds - baseDate));
    }
}
