// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as url from 'url';

export function getDiscoveryPattern(baseUrl: string, discoveryPatterns?: string[]): string[] {
    return discoveryPatterns === undefined ? getDefaultDiscoveryPattern(baseUrl) : discoveryPatterns;
}

function getDefaultDiscoveryPattern(baseUrl: string): string[] {
    const baseUrlObj = url.parse(baseUrl);

    return [`http[s?]://${baseUrlObj.host}${baseUrlObj.path}[.*]`];
}
