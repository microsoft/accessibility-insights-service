// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryHelper, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { WebsiteScanResultProvider } from 'service-library';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { uniq } from 'lodash';

@injectable()
export class WebsiteScanResultWriter {
    private readonly maxRetryCount = 2;

    constructor(
        @inject(WebsiteScanResultProvider) protected readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(RetryHelper) private readonly retryHelper: RetryHelper<unknown>,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async updateWebsiteScanResultWithDiscoveredUrls(
        pageScanResult: OnDemandPageScanResult,
        discoveredUrls: string[],
        discoveryPatterns: string[],
    ): Promise<WebsiteScanResult> {
        return this.executeUpdateWithRetries<WebsiteScanResult>(
            async () => this.updateWebsiteScanResultWithDiscoveredUrlsImpl(pageScanResult, discoveredUrls, discoveryPatterns),
            `Failure to update website scan result with deep scan data. Retrying on error.`,
        );
    }

    private async executeUpdateWithRetries<T>(action: () => Promise<T>, errorMessage: string): Promise<T> {
        return this.retryHelper.executeWithRetries(
            action,
            async (error: Error) => {
                this.logger.logError(errorMessage, {
                    error: System.serializeError(error),
                });
            },
            this.maxRetryCount,
            1000,
        ) as Promise<T>;
    }

    private async updateWebsiteScanResultWithDiscoveredUrlsImpl(
        pageScanResult: OnDemandPageScanResult,
        discoveredUrls: string[],
        discoveryPatterns: string[],
    ): Promise<WebsiteScanResult> {
        const websiteScanRef = pageScanResult.websiteScanRefs.find((ref) => ref.scanGroupType === 'deep-scan');
        const websiteScanResult = await this.websiteScanResultProvider.read(websiteScanRef.id);
        const knownPages = websiteScanResult.knownPages ?? [];
        const updatedKnownPages = uniq(discoveredUrls.concat(knownPages));

        const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
            id: websiteScanResult.id,
            knownPages: updatedKnownPages,
            _etag: websiteScanResult._etag,
            discoveryPatterns: discoveryPatterns,
        };

        return this.updateWebsiteScanResult(updatedWebsiteScanResult);
    }

    private async updateWebsiteScanResult(websiteScanResult: Partial<WebsiteScanResult>): Promise<WebsiteScanResult> {
        try {
            const websiteScanResultDdDocument = await this.websiteScanResultProvider.mergeOrCreate(websiteScanResult);
            this.logger.logInfo(`Successfully updated website scan result document.`);

            return websiteScanResultDdDocument;
        } catch (error) {
            this.logger.logError(`Failed to update website scan result document.`, {
                error: System.serializeError(error),
            });

            throw new Error(
                `Failed to update website scan result document. Id: ${websiteScanResult.id} Error: ${System.serializeError(error)}`,
            );
        }
    }
}
