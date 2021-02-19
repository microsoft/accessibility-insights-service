// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { RetryHelper, System } from 'common';
import { WebsiteScanResultProvider } from 'service-library';
import { AxeScanResults } from 'scanner-global-library';
import { OnDemandPageScanResult, WebsiteScanResult, WebsiteScanRef } from 'storage-documents';
import { ReportWriter } from '../report-generator/report-writer';
import { CombinedAxeResultBuilder } from './combined-axe-result-builder';
import { CombinedReportGenerator } from './combined-report-generator';
import { CombinedResultsBlobProvider } from './combined-results-blob-provider';

@injectable()
export class CombinedScanResultProcessor {
    private readonly maxRetryCount: number = 5;
    private readonly msecBetweenRetries: number = 1000;

    constructor(
        @inject(CombinedAxeResultBuilder) protected readonly combinedAxeResultBuilder: CombinedAxeResultBuilder,
        @inject(CombinedReportGenerator) protected readonly combinedReportGenerator: CombinedReportGenerator,
        @inject(CombinedResultsBlobProvider) protected readonly combinedResultsBlobProvider: CombinedResultsBlobProvider,
        @inject(WebsiteScanResultProvider) protected readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(ReportWriter) protected readonly reportWriter: ReportWriter,
        @inject(RetryHelper) private readonly retryHelper: RetryHelper<void>,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async generateCombinedScanResults(axeScanResults: AxeScanResults, pageScanResult: OnDemandPageScanResult): Promise<void> {
        await this.retryHelper.executeWithRetries(
            async () => this.generateCombinedScanResultsImpl(axeScanResults, pageScanResult),
            async (error: Error) => {
                this.logger.logError(`Failure to generate combined scan result. Retrying on error.`, {
                    error: System.serializeError(error),
                });
            },
            this.maxRetryCount,
            this.msecBetweenRetries,
        );
    }

    private async generateCombinedScanResultsImpl(axeScanResults: AxeScanResults, pageScanResult: OnDemandPageScanResult): Promise<void> {
        const websiteScanRef = this.getWebsiteScanRefs(pageScanResult);
        if (!websiteScanRef) {
            return;
        }

        const websiteScanResult = await this.websiteScanResultProvider.read(websiteScanRef.id);
        const combinedResultsBlob = await this.combinedResultsBlobProvider.getBlob(websiteScanResult.combinedResultsBlobId);
        const combinedResultsBlobId = combinedResultsBlob.blobId;

        this.logger.setCommonProperties({
            combinedResultsBlobId,
            websiteScanId: websiteScanRef.id,
        });

        const combinedAxeResults = await this.combinedAxeResultBuilder.mergeAxeResults(axeScanResults.results, combinedResultsBlob);
        const generatedReport = this.combinedReportGenerator.generate(
            combinedAxeResults,
            websiteScanResult,
            axeScanResults.userAgent,
            axeScanResults.browserResolution,
        );
        const pageScanReport = await this.reportWriter.write(generatedReport);

        const updatedWebsiteScanResults = {
            id: websiteScanResult.id,
            combinedResultsBlobId: combinedResultsBlobId,
            reports: [pageScanReport],
        } as Partial<WebsiteScanResult>;
        await this.websiteScanResultProvider.mergeOrCreate(updatedWebsiteScanResults);

        if (pageScanReport) {
            if (pageScanResult.reports) {
                pageScanResult.reports.push(pageScanReport);
            } else {
                pageScanResult.reports = [pageScanReport];
            }
        }
    }

    private getWebsiteScanRefs(pageScanResult: OnDemandPageScanResult): WebsiteScanRef {
        if (!pageScanResult.websiteScanRefs) {
            return undefined;
        }

        return pageScanResult.websiteScanRefs.find(
            (ref) => ref.scanGroupType === 'consolidated-scan-report' || ref.scanGroupType === 'deep-scan',
        );
    }
}
