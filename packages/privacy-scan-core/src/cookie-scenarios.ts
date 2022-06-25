// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type CookieScenario = {
    name: string;
    value: string;
};

export const getAllCookieScenarios = (): CookieScenario[] => {
    /**
     * Cookies:
     * - property:
     * c1 - Analytics
     * c2 - Social Media
     * c3 - Advertising
     *
     * - values:
     * Accepted = 2
     * Rejected = 1
     */
    return [
        {
            // Analytics - accepted
            name: 'MSCC',
            value: 'cid=3nqibqsmahlqkom8tlvlek2q-c1=2-c2=0-c3=0',
        },
        {
            // Social Media - accepted
            name: 'MSCC',
            value: 'cid=3nqibqsmahlqkom8tlvlek2q-c1=0-c2=2-c3=0',
        },
        {
            // Advertising - accepted
            name: 'MSCC',
            value: 'cid=3nqibqsmahlqkom8tlvlek2q-c1=0-c2=0-c3=2',
        },
        {
            // All - accepted
            name: 'MSCC',
            value: 'cid=3nqibqsmahlqkom8tlvlek2q-c1=2-c2=2-c3=2',
        },
    ];
};
