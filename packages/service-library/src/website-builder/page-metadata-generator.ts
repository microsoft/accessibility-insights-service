// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { BrowserError, Page } from 'scanner-global-library';
import { AuthenticationType, WebsiteScanResult } from 'storage-documents';
import { cloneDeep } from 'lodash';
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
    browserError?: BrowserError;
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
            foreignLocation = await this.hasForeignLocation(url, page, websiteScanResult);
        }

        const allowed =
            urlAllowed &&
            (page.pageAnalysisResult?.loadedUrl === undefined || this.urlLocationValidator.allowed(page.pageAnalysisResult.loadedUrl));

        const pageMetadata = {
            url,
            allowed,
            loadedUrl: page.pageAnalysisResult?.loadedUrl,
            redirection: page.pageAnalysisResult?.redirection,
            authentication: page.pageAnalysisResult?.authentication,
            authenticationType: page.pageAnalysisResult?.authenticationType,
            foreignLocation,
        };

        const browserError = this.getBrowserError(pageMetadata);

        return {
            ...pageMetadata,
            browserError,
        };
    }

    private async hasForeignLocation(url: string, page: Page, websiteScanResult: WebsiteScanResult): Promise<boolean> {
        if (page.pageAnalysisResult?.redirection === true) {
            const discoveryPatterns = cloneDeep(websiteScanResult?.discoveryPatterns) ?? [
                this.createDiscoveryPatternFn(websiteScanResult?.baseUrl ?? url),
            ];

            // Discovery pattern can be sent in the scan request or created from the base URL that is sent
            // in the scan request as well. Both discovery patterns may not match to the scan request
            // URL due to misconfiguration. To enable processing the scan request URL we always adding
            // pattern created from the scan request URL.
            discoveryPatterns.push(this.createDiscoveryPatternFn(url, false));

            // eslint-disable-next-line security/detect-non-literal-regexp
            const match = discoveryPatterns.filter((r) => new RegExp(r, 'i').test(page.pageAnalysisResult.loadedUrl)).length > 0;

            return !match;
        }

        return false;
    }

    private getBrowserError(pageMetadata: PageMetadata): BrowserError {
        // Unsupported resource
        if (pageMetadata.allowed === false) {
            return {
                errorType: 'UnsupportedResource',
                message: `The resource is not supported.`,
            };
        }

        // Redirected to an unsupported authentication location
        if (pageMetadata.foreignLocation === true && pageMetadata.authenticationType === 'undetermined') {
            return {
                errorType: 'AuthenticationError',
                message: `The resource was redirected to an unsupported authentication provider.`,
            };
        }

        // Redirected to a foreign location
        if (pageMetadata.foreignLocation === true && pageMetadata.authentication !== true) {
            return {
                errorType: 'ForeignResourceRedirection',
                message: `The resource was redirected to a foreign location.`,
            };
        }

        return undefined;
    }
}
