// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as nodeUrl from 'url';

export namespace Url {
    export function tryParseUrlString(url: string, absoluteUrlOnly: boolean = true): nodeUrl.Url {
        const absoluteUrlRegEx = /^(?:[a-z]+:)?\/\//i;
        try {
            const urlParsed = nodeUrl.parse(url);
            if (absoluteUrlOnly && urlParsed.href.match(absoluteUrlRegEx) === null) {
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
}
