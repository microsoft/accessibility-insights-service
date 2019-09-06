// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// @ts-ignore
import * as uuid from 'uuid-with-v6';

// tslint:disable: no-unsafe-any

export namespace Guid {
    export function createGuid(): string {
        return uuid.v6();
    }

    export function createGuidForNode(baseGuid: string): string {
        const guid = <string>uuid.v6();
        const guidNode = getGuidNode(baseGuid);

        return `${guid.substr(0, 24)}${guidNode}`;
    }

    export function getGuidNode(guid: string): string {
        return guid.replace(new RegExp('-', 'g'), '').substr(20, 12);
    }

    export function getGuidTimestamp(guid: string): Date {
        const guidValue = guid.replace('-', '');
        if (guidValue.substr(13, 1) !== '6') {
            throw new Error('Only version 6 of UUID is supported.');
        }

        const timestampMilliseconds = BigInt(`0x${guidValue.substr(0, 12)}${guidValue.substr(14, 3)}`) / 10000n;
        const baseDate = BigInt(Math.abs(new Date(Date.UTC(1582, 9, 15)).valueOf()));

        return new Date(Number(timestampMilliseconds - baseDate));
    }
}
