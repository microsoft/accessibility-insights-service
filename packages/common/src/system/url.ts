// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as nodeUrl from 'url';
import { isNil } from 'lodash';
import * as normalizeUrlExt from 'normalize-url';

export namespace Url {
    export function tryParseUrlString(url: string, absoluteUrlOnly: boolean = true): nodeUrl.Url {
        try {
            const urlParsed = nodeUrl.parse(url);
            if (absoluteUrlOnly && isNil(urlParsed.protocol)) {
                return undefined;
            }

            return urlParsed;
        } catch (error) {
            return undefined;
        }
    }

    export function getRootUrl(url: string): string {
        let rootUrl = url.trim();
        const lastSlashPos = rootUrl.lastIndexOf('/');
        rootUrl = rootUrl.substr(0, lastSlashPos + 1);

        return rootUrl;
    }

    export function hasQueryParameters(url: string): boolean {
        return url.indexOf('?') !== -1;
    }

    export function normalizeUrl(url: string): string {
        return normalizeUrlExt.default(url, { stripHash: true, removeQueryParameters: false });
    }

    export function getParameterValue(name: string, url: string): string {
        const urlObj = new nodeUrl.URL(url);
        const value = urlObj.searchParams.get(name);

        return value ?? undefined;
    }
}
