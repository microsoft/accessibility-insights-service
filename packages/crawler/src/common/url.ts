// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as normalizeUrlExt from 'normalize-url';

export namespace Url {
    export function normalizeUrl(url: string): string {
        return normalizeUrlExt.default(url, { stripHash: true, removeQueryParameters: false });
    }
}
