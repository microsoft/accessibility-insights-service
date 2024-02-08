// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as normalizeUrlExt from 'normalize-url';

export namespace Url {
    export function normalizeUrl(url: string, keepUrlFragment?:boolean): string {
        const stripHash = keepUrlFragment !== null && keepUrlFragment !== undefined ? !keepUrlFragment : true
        return normalizeUrlExt.default(url, { stripHash: stripHash, removeQueryParameters: false });
    }

    export function hasQueryParameters(url: string): boolean {
        return url.indexOf('?') !== -1;
    }
}
