// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { getDiscoveryPattern } from './get-discovery-pattern';

describe(getDiscoveryPattern, () => {
    const host = 'hostname.com';
    const path = '/path/to/page';
    let baseUrl: string;

    beforeEach(() => {
        baseUrl = `https://${host}${path}`;
    });

    it('get discovery patterns with no list provided', () => {
        const expectedPattern = `http[s?]://${host}${path}[.*]`;

        const discoveryPatterns = getDiscoveryPattern(baseUrl, undefined);

        expect(discoveryPatterns.length).toBe(1);
        expect(discoveryPatterns[0]).toBe(expectedPattern);
    });

    it('get discovery patterns with list provided', () => {
        const expectedDiscoveryPatterns = ['pattern1', 'pattern2'];

        const discoveryPatterns = getDiscoveryPattern(baseUrl, expectedDiscoveryPatterns);

        expect(discoveryPatterns).toBe(expectedDiscoveryPatterns);
    });
});
