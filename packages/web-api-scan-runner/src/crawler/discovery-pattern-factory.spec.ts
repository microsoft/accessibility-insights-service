// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { createDiscoveryPattern } from './discovery-pattern-factory';

describe(createDiscoveryPattern, () => {
    const host = 'hostname.com';
    const pathname = '/path/to/page';
    const path = `${pathname}?q=1`;
    let url: string;

    beforeEach(() => {
        url = `https://${host}${path}`;
    });

    it('creates discovery pattern', () => {
        const expectedPattern = `^http(s?)://${host}${pathname}(.*)`;
        const actualPattern = createDiscoveryPattern(url);
        expect(actualPattern).toEqual(expectedPattern);
    });

    it('ignore empty base url', () => {
        const actualPattern = createDiscoveryPattern('');
        expect(actualPattern).toBeUndefined();
    });
});
