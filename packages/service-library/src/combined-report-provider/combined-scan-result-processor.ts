// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { RetryHelper, System } from 'common';
import { AxeScanResults } from 'scanner-global-library';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { WebsiteScanResultProvider } from '../data-providers/website-scan-result-provider';
import { ReportWriter } from '../data-providers/report-writer';
import { CombinedAxeResultBuilder } from './combined-axe-result-builder';
import { CombinedReportGenerator } from './combined-report-generator';
import { CombinedResultsBlobProvider } from './combined-results-blob-provider';

@injectable()
export class CombinedScanResultProcessor {
    private readonly maxRetryCount: number = 5;

    private readonly msecBetweenRetries: number = 1000;

    private readonly maxCombinedResultsBlobSize = 10 * 1024 * 1024;

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
        const websiteScanResult = await this.websiteScanResultProvider.read(pageScanResult.websiteScanRef.id);

        let combinedResultsBlobId = websiteScanResult.reports?.find((report) => report.format === 'consolidated.html')?.reportId;
        const combinedResultsBlob = await this.combinedResultsBlobProvider.getBlob(combinedResultsBlobId);
        combinedResultsBlobId = combinedResultsBlobId || combinedResultsBlob.blobId;

        this.logger.setCommonProperties({
            combinedResultsBlobId,
            websiteScanId: pageScanResult.websiteScanRef.id,
        });

        const length = Buffer.byteLength(JSON.stringify(combinedResultsBlob), 'utf8');
        if (length > this.maxCombinedResultsBlobSize) {
            this.logger.logError(
                `Failure to generate combined scan result. Combined scan result blob exceeded maximum supported size of ${
                    this.maxCombinedResultsBlobSize / (1024 * 1024)
                } MB.`,
            );

            return;
        }

        const combinedAxeResults = await this.combinedAxeResultBuilder.mergeAxeResults(axeScanResults.results, combinedResultsBlob);
        const generatedReport = this.combinedReportGenerator.generate(
            combinedResultsBlobId,
            combinedAxeResults,
            websiteScanResult,
            axeScanResults.userAgent,
            axeScanResults.browserResolution,
        );
        const pageScanReport = await this.reportWriter.write(generatedReport);

        const updatedWebsiteScanResults = {
            id: websiteScanResult.id,
            reports: [pageScanReport],
        } as Partial<WebsiteScanResult>;
        await this.websiteScanResultProvider.mergeOrCreate(pageScanResult.id, updatedWebsiteScanResults);

        if (pageScanReport) {
            if (pageScanResult.reports) {
                if (pageScanResult.reports.some((report) => report.reportId === pageScanReport.reportId)) {
                    // replace report if already exists
                    pageScanResult.reports = pageScanResult.reports.map((report) =>
                        report.reportId === pageScanReport.reportId ? pageScanReport : report,
                    );
                } else {
                    pageScanResult.reports.push(pageScanReport);
                }
            } else {
                pageScanResult.reports = [pageScanReport];
            }
        }
    }
}
