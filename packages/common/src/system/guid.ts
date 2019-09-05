// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// @ts-ignore
import * as uuid from 'uuid-with-v6';

export namespace Guid {
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
