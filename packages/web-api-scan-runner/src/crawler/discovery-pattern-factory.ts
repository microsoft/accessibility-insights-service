// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import url from 'url';

export function createDiscoveryPattern(pseudoUrl: string): string {
    const urlObj = url.parse(pseudoUrl);

    return `http(s?)://${urlObj.host}${urlObj.pathname}(.*)`;
}
