// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { Page } from 'scanner-global-library';
import { AuthenticationType, WebsiteScanResult } from 'storage-documents';
import { createDiscoveryPattern } from '../crawler/discovery-pattern-factory';
import { UrlLocationValidator } from './url-location-validator';

export interface PageMetadata {
    url: string;
    allowed: boolean;
    loadedUrl?: string;
    redirection?: boolean;
    authentication?: boolean;
    authenticationType?: AuthenticationType;
    foreignLocation?: boolean;
}

@injectable()
export class PageMetadataGenerator {
    public constructor(
        @inject(UrlLocationValidator) private readonly urlLocationValidator: UrlLocationValidator,
        private readonly createDiscoveryPatternFn: typeof createDiscoveryPattern = createDiscoveryPattern,
    ) {}

    public async getMetadata(url: string, page: Page, websiteScanResult: WebsiteScanResult): Promise<PageMetadata> {
        let foreignLocation = false;

        const urlAllowed = this.urlLocationValidator.allowed(url);
        if (urlAllowed === true) {
            await page.analyze(url);
            foreignLocation = await this.hasForeignLocation(page, websiteScanResult);
        }

        return {
            url,
            allowed:
                urlAllowed &&
                (page.pageAnalysisResult?.loadedUrl === undefined || this.urlLocationValidator.allowed(page.pageAnalysisResult.loadedUrl)),
            loadedUrl: page.pageAnalysisResult?.loadedUrl,
            redirection: page.pageAnalysisResult?.redirection,
            authentication: page.pageAnalysisResult?.authentication,
            authenticationType: page.pageAnalysisResult?.authenticationType,
            foreignLocation,
        };
    }

    private async hasForeignLocation(page: Page, websiteScanResult: WebsiteScanResult): Promise<boolean> {
        if (page.pageAnalysisResult?.redirection === true) {
            const discoveryPatterns = websiteScanResult?.discoveryPatterns ?? [
                this.createDiscoveryPatternFn(websiteScanResult?.baseUrl ?? page.pageAnalysisResult.url),
            ];
            // eslint-disable-next-line security/detect-non-literal-regexp
            const match = discoveryPatterns.filter((r) => new RegExp(r, 'i').test(page.pageAnalysisResult.loadedUrl)).length > 0;

            return !match;
        }

        return false;
    }
}
