// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryHelper, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AxeScanResults } from 'scanner-global-library';
import { WebsiteScanResultProvider } from 'service-library';
import { OnDemandPageScanResult, ScanGroupType, WebsiteScanRef, WebsiteScanResult } from 'storage-documents';
import { AxeResultMerger } from './axe-result-merger';
import { CombinedReportGenerator } from './combined-report-generator';
import { CombinedResultsBlobGetter } from './combined-results-blob-getter';
import { ReportSaver } from './report-saver';
import { UrlDeduplicator } from './url-deduplicator';

@injectable()
export class WebsiteScanResultUpdater {
    private readonly maxCombinedResultProcessingRetryCount = 2;

    constructor(
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(RetryHelper) private readonly retryHelper: RetryHelper<void>,
        @inject(WebsiteScanResultProvider) protected readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(AxeResultMerger) protected readonly axeResultMerger: AxeResultMerger,
        @inject(CombinedReportGenerator) protected readonly combinedReportGenerator: CombinedReportGenerator,
        @inject(ReportSaver) protected readonly reportSaver: ReportSaver,
        @inject(CombinedResultsBlobGetter) protected readonly combinedResultsBlobGetter: CombinedResultsBlobGetter,
        @inject(UrlDeduplicator) protected readonly urlDeduplicator: UrlDeduplicator,
    ) {}

    public async generateCombinedScanResults(axeScanResults: AxeScanResults, pageScanResult: OnDemandPageScanResult): Promise<void> {
        await this.executeUpdateWithRetries(
            async () => this.generateCombinedScanResultsImpl(axeScanResults, pageScanResult),
            `Failure to generate combined scan result. Retrying on error.`,
        );
    }

    public async updateWebsiteScanResultWithDiscoveredUrls(
        pageScanResult: OnDemandPageScanResult,
        newlyDiscoveredUrls: string[],
    ): Promise<void> {
        await this.executeUpdateWithRetries(
            async () => this.updateWebsiteScanResultWithDiscoveredUrlsImpl(pageScanResult, newlyDiscoveredUrls),
            `Failure to generate combined scan result. Retrying on error.`,
        );
    }

    private async executeUpdateWithRetries(action: () => Promise<void>, errorMessage: string): Promise<void> {
        await this.retryHelper.executeWithRetries(
            action,
            async (error: Error) => {
                this.logger.logError(errorMessage, {
                    error: System.serializeError(error),
                });
            },
            this.maxCombinedResultProcessingRetryCount,
            1000,
        );
    }

    private async generateCombinedScanResultsImpl(axeScanResults: AxeScanResults, pageScanResult: OnDemandPageScanResult): Promise<void> {
        const websiteScanRef = this.getWebsiteScanRef(pageScanResult, 'consolidated-scan-report');
        if (!websiteScanRef) {
            return;
        }

        const websiteScanResult = await this.websiteScanResultProvider.read(websiteScanRef.id);
        const combinedResultsBlobInfo = await this.combinedResultsBlobGetter.getBlobInfo(websiteScanResult.combinedResultsBlobId);
        const combinedResultsBlobId = combinedResultsBlobInfo.blobId;

        this.logger.setCommonProperties({
            combinedResultsBlobId,
            websiteScanId: websiteScanRef.id,
        });

        const combinedAxeResults = await this.axeResultMerger.mergeAxeResults(axeScanResults.results, combinedResultsBlobInfo);
        const report = await this.reportSaver.save(
            this.combinedReportGenerator.generate(
                combinedAxeResults,
                websiteScanResult,
                axeScanResults.userAgent,
                axeScanResults.browserResolution,
            ),
        );

        const updatedWebsiteScanResults = {
            id: websiteScanResult.id,
            combinedResultsBlobId: combinedResultsBlobId,
            reports: [report],
            _etag: websiteScanResult._etag,
        } as Partial<WebsiteScanResult>;

        await this.updateWebsiteScanResult(updatedWebsiteScanResults, ' with combined result metadata');

        if (report) {
            pageScanResult.reports.push(report);
        }
    }

    private async updateWebsiteScanResultWithDiscoveredUrlsImpl(
        pageScanResult: OnDemandPageScanResult,
        newlyDiscoveredUrls: string[],
    ): Promise<void> {
        const websiteScanRef = this.getWebsiteScanRef(pageScanResult, 'deep-scan');
        if (!websiteScanRef) {
            return;
        }

        const websiteScanResult = await this.websiteScanResultProvider.read(websiteScanRef.id);
        const knownPages = websiteScanResult.knownPages;
        const updatedKnownPages = this.urlDeduplicator.dedupe(knownPages, newlyDiscoveredUrls);

        const updatedWebsiteScanResults: Partial<WebsiteScanResult> = {
            id: websiteScanResult.id,
            knownPages: updatedKnownPages,
            _etag: websiteScanResult._etag,
        };

        return this.updateWebsiteScanResult(updatedWebsiteScanResults);
    }

    private async updateWebsiteScanResult(updatedWebsiteScanResults: Partial<WebsiteScanResult>, description?: string): Promise<void> {
        try {
            this.websiteScanResultProvider.mergeOrCreate(updatedWebsiteScanResults);
            this.logger.logInfo(`Successfully updated website scan results${description}.`);
        } catch (error) {
            this.logger.logError(`Failed to update website scan results with combined result metadata${description}.`, {
                error: System.serializeError(error),
            });

            throw new Error(
                `Failed to update website scan results${description}. Document Id: ${
                    updatedWebsiteScanResults.id
                } Error: ${System.serializeError(error)}`,
            );
        }
    }

    private getWebsiteScanRef(pageScanResult: OnDemandPageScanResult, scanGroupType: ScanGroupType): WebsiteScanRef | void {
        if (pageScanResult.websiteScanRefs === undefined) {
            return;
        }

        return pageScanResult.websiteScanRefs.find((ref) => ref.scanGroupType === scanGroupType);
    }
}
