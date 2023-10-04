// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { Page, LoginPageType } from 'scanner-global-library';
import { WebsiteScanResult } from 'storage-documents';
import { createDiscoveryPattern } from '../crawler/discovery-pattern-factory';

export interface PageMetadata {
    url: string;
    loadedUrl?: string;
    redirection?: boolean;
    authentication?: boolean;
    loginPageType?: LoginPageType;
    foreignLocation?: boolean;
}

@injectable()
export class PageMetadataGenerator {
    public constructor(
        @inject(Page) private readonly page: Page,
        private readonly createDiscoveryPatternFn: typeof createDiscoveryPattern = createDiscoveryPattern,
    ) {}

    public async getMetadata(url: string, websiteScanResult: WebsiteScanResult): Promise<PageMetadata> {
        await this.page.analyze(url);
        const foreignLocation = await this.hasForeignLocation(websiteScanResult);

        return {
            url,
            loadedUrl: this.page.pageAnalysisResult?.loadedUrl,
            redirection: this.page.pageAnalysisResult?.redirection,
            authentication: this.page.pageAnalysisResult?.authentication,
            loginPageType: this.page.pageAnalysisResult?.loginPageType,
            foreignLocation,
        };
    }

    private async hasForeignLocation(websiteScanResult: WebsiteScanResult): Promise<boolean> {
        if (this.page.pageAnalysisResult?.redirection === true) {
            const discoveryPatterns = websiteScanResult?.discoveryPatterns ?? [
                this.createDiscoveryPatternFn(websiteScanResult?.baseUrl ?? this.page.pageAnalysisResult.url),
            ];
            // eslint-disable-next-line security/detect-non-literal-regexp
            const match = discoveryPatterns.filter((r) => new RegExp(r, 'i').test(this.page.pageAnalysisResult.loadedUrl)).length > 0;

            return !match;
        }

        return false;
    }
}
