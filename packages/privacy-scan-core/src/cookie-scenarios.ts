// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type CookieScenario = {
    name: string;
    value: string;
};

export const getAllCookieScenarios = (): CookieScenario[] => {
    const timestamp = Date.now();

    return [
        {
            name: 'MSCC',
            value: `${timestamp}`,
        },
        {
            name: 'MSCC',
            value: 'cid=3nqibqsmahlqkom8tlvlek2q-c1=2-c2=0-c3=0',
        },
        {
            name: 'MSCC',
            value: 'cid=3nqibqsmahlqkom8tlvlek2q-c1=0-c2=2-c3=0',
        },
        {
            name: 'MSCC',
            value: 'cid=3nqibqsmahlqkom8tlvlek2q-c1=0-c2=0-c3=2',
        },
        {
            name: 'MSCC',
            value: 'cid=3nqibqsmahlqkom8tlvlek2q-c1=2-c2=2-c3=2',
        },
    ];
};
