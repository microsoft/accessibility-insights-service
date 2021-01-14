// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as url from 'url';

export type DiscoveryPatternFactory = (discoveryPatternUrl: string) => string;

export const getDiscoveryPatternForUrl: DiscoveryPatternFactory = (discoveryPatternUrl: string): string => {
    const urlObj = url.parse(discoveryPatternUrl);

    return `http[s?]://${urlObj.host}${urlObj.path}[.*]`;
};
