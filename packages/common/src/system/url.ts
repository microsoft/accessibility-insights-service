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
}
