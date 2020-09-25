// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';

// @ts-ignore
import * as uuid from 'uuid-with-v6';

/**
 * UUID RFC 4122 https://tools.ietf.org/html/rfc4122
 */
@injectable()
export class GuidGenerator {
    /**
     * Creates new UUID version 6.
     */
    public createGuid(): string {
        return uuid.v6();
    }

    /**
     * Creates UUID with the same UUID node part (the last 12 bytes) as base UUID.
     * @param baseGuid The UUID to match the UUID node with.
     */
    public createGuidFromBaseGuid(baseGuid: string): string {
        const guid = <string>uuid.v6();
        const guidNode = this.getGuidNode(baseGuid);

        return `${guid.substr(0, 24)}${guidNode}`;
    }

    /**
     * Returns the UUID node part (the last 12 bytes).
     * @param guid The UUID to get node part from.
     */
    public getGuidNode(guid: string): string {
        return guid.replace(new RegExp('-', 'g'), '').substr(20, 12);
    }

    /**
     * Returns the UUID timestamp.
     * @param guid The UUID to get the timestamp part from.
     */
    public getGuidTimestamp(guid: string): Date {
        const guidValue = guid.replace('-', '');
        if (guidValue.substr(13, 1) !== '6') {
            throw new Error('Only version 6 of UUID is supported.');
        }

        const timestampMilliseconds = BigInt(`0x${guidValue.substr(0, 12)}${guidValue.substr(14, 3)}`) / 10000n;
        const baseDate = BigInt(Math.abs(new Date(Date.UTC(1582, 9, 15)).valueOf()));

        return new Date(Number(timestampMilliseconds - baseDate));
    }

    /**
     * Returns if input string is a valid version 6 UUID.
     * @param guid The UUID to validate.
     */
    public isValidV6Guid(guid: string): boolean {
        const guidV6Regex = new RegExp(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-6[0-9a-fA-F]{3}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);

        return guidV6Regex.test(guid);
    }
}
