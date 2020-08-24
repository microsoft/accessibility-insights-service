// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class URLProcessor {
    public getRootUrl(url: string): string {
        let rootUrl = url.trim();
        const lastSlashPos = rootUrl.lastIndexOf('/');
        rootUrl = rootUrl.substr(0, lastSlashPos + 1);

        return rootUrl;
    }

    public hasQueryParameters(url: string): boolean {
        return url.indexOf('?') !== -1;
    }
}
