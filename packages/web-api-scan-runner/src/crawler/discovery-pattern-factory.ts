// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import url from 'url';
import { isEmpty } from 'lodash';

/**
 * Returns RegEx string that is used to find new links on a page.
 */
export function createDiscoveryPattern(pseudoUrl: string): string {
    if (isEmpty(pseudoUrl)) {
        return undefined;
    }

    const urlObj = url.parse(pseudoUrl);

    return `^http(s?)://${urlObj.host}${urlObj.pathname}(.*)`;
}
