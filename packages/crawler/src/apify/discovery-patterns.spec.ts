// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';
import { getDiscoveryPatternForUrl } from './discovery-patterns';

describe(getDiscoveryPatternForUrl, () => {
    const host = 'hostname.com';
    const path = '/path/to/page';
    let url: string;

    beforeEach(() => {
        url = `https://${host}${path}`;
    });

    it('Creates discovery pattern for url', () => {
        const expectedPattern = `http[s?]://${host}${path}[.*]`;

        const actualPattern = getDiscoveryPatternForUrl(url);

        expect(actualPattern).toEqual(expectedPattern);
    });
});
