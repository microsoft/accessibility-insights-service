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
        rootUrl = rootUrl.substring(0, lastSlashPos + 1);

        return rootUrl;
    }

    export function hasQueryParameters(url: string): boolean {
        return url.indexOf('?') !== -1;
    }

    /**
     * [Normalizes](https://en.wikipedia.org/wiki/URL_normalization) URL.
     */
    export function normalizeUrl(url: string): string {
        const options: normalizeUrlExt.Options = {
            normalizeProtocol: false,
            removeSingleSlash: false,
            removeTrailingSlash: false,
            stripHash: true,
            stripTextFragment: true,
            stripWWW: false,
        };

        // Reset single slash since the library will remove single slash if URL has hash fragment
        if (url && url.includes('#')) {
            let temp = normalizeUrlExt.default(url, options);
            temp = `${temp}/`;

            return normalizeUrlExt.default(temp, options);
        }

        return normalizeUrlExt.default(url, options);
    }

    export function getParameterValue(name: string, url: string): string {
        const urlObj = new nodeUrl.URL(url);
        const value = urlObj.searchParams.get(name);

        return value ?? undefined;
    }

    /**
     * Returns absolute URL of base URL.
     * If URL has has different origin from base URL will return URL.
     */
    export function getAbsoluteUrl(url: string, base: string): string {
        const urlObj = new nodeUrl.URL(url, base);

        return urlObj.toString();
    }
}
