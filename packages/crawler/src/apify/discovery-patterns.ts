// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import url from 'url';

export type DiscoveryPatternFactory = (pseudoUrl: string) => string;

export const getDiscoveryPatternForUrl: DiscoveryPatternFactory = (pseudoUrl: string): string => {
    const urlObj = url.parse(pseudoUrl);

    return `http(s?)://${urlObj.host}${urlObj.pathname}(.*)`;
};
