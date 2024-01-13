// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isNil, pullAllBy, take } from 'lodash';
import { inject, injectable } from 'inversify';
import { Url } from 'common';
import { UrlLocationValidator } from '../website-builder/url-location-validator';

@injectable()
export class DiscoveredUrlProcessor {
    constructor(@inject(UrlLocationValidator) private readonly urlLocationValidator: UrlLocationValidator) {}

    public process(discoveredUrls: string[], deepScanDiscoveryLimit: number, knownUrls?: string[]): string[] {
        if (isNil(discoveredUrls)) {
            return [];
        }

        let processedUrls = this.excludeKnownResources(discoveredUrls);
        if (!isNil(knownUrls)) {
            processedUrls = this.removeUrlsFromList(discoveredUrls, knownUrls);
        }

        return this.limitUrlCount(processedUrls, this.getUrlLimit(deepScanDiscoveryLimit, knownUrls));
    }

    private removeUrlsFromList(urlList: string[], removeUrls: string[]): string[] {
        return pullAllBy(urlList, removeUrls, Url.normalizeUrl);
    }

    private limitUrlCount(urlList: string[], numUrls: number): string[] {
        return take(urlList, numUrls);
    }

    private getUrlLimit(deepScanDiscoveryLimit: number, knownUrls?: string[]): number {
        const knownPagesCount = isNil(knownUrls) ? 0 : knownUrls.length;

        return Math.max(deepScanDiscoveryLimit - knownPagesCount, 0);
    }

    private excludeKnownResources(discoveredUrls: string[]): string[] {
        return discoveredUrls.filter((url) => this.urlLocationValidator.allowed(url));
    }
}
