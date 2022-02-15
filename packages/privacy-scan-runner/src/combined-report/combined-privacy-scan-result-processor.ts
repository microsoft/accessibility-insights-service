// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { GuidGenerator, RetryHelper, System } from 'common';
import { PrivacyReportReadResponse, PrivacyScanCombinedReportProvider, WebsiteScanResultProvider } from 'service-library';
import { PrivacyScanResult } from 'scanner-global-library';
import {
    OnDemandPageScanResult,
    WebsiteScanResult,
    WebsiteScanRef,
    PrivacyScanCombinedReport,
    OnDemandPageScanReport,
} from 'storage-documents';
import { PrivacyReportReducer } from './privacy-report-reducer';

@injectable()
export class CombinedPrivacyScanResultProcessor {
    private readonly maxRetryCount: number = 5;

    private readonly msecBetweenRetries: number = 1000;

    constructor(
        @inject(PrivacyScanCombinedReportProvider) protected readonly combinedReportProvider: PrivacyScanCombinedReportProvider,
        @inject(PrivacyReportReducer) protected readonly privacyReportReducer: PrivacyReportReducer,
        @inject(WebsiteScanResultProvider) protected readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(RetryHelper) private readonly retryHelper: RetryHelper<void>,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
    ) {}

    public async generateCombinedScanResults(privacyScanResults: PrivacyScanResult, pageScanResult: OnDemandPageScanResult): Promise<void> {
        await this.retryHelper.executeWithRetries(
            async () => this.generateCombinedScanReportImpl(privacyScanResults, pageScanResult),
            async (error: Error) => {
                this.logger.logError(`Failure to generate combined scan result. Retrying on error.`, {
                    error: System.serializeError(error),
                });
            },
            this.maxRetryCount,
            this.msecBetweenRetries,
        );
    }

    private async generateCombinedScanReportImpl(
        privacyScanResults: PrivacyScanResult,
        pageScanResult: OnDemandPageScanResult,
    ): Promise<void> {
        const websiteScanRef = this.getWebsiteScanRefs(pageScanResult);
        if (!websiteScanRef) {
            return;
        }

        const websiteScanResult = await this.websiteScanResultProvider.read(websiteScanRef.id);
        let combinedReportId = websiteScanResult.reports?.find((report) => report.format === 'consolidated.json')?.reportId;
        const combinedReportReadResponse = await this.getCombinedReport(combinedReportId);

        combinedReportId = combinedReportId || this.guidGenerator.createGuid();
        this.logger.setCommonProperties({
            combinedReportId,
            websiteScanId: combinedReportId,
        });

        const combinedReport = this.privacyReportReducer.reduceResults(privacyScanResults, combinedReportReadResponse?.results, {
            scanId: pageScanResult.id,
            websiteScanId: websiteScanResult.id,
            url: pageScanResult.url,
        });
        const report = await this.writeCombinedReport(combinedReportId, combinedReport, combinedReportReadResponse?.etag);

        const updatedWebsiteScanResults = {
            id: websiteScanResult.id,
            reports: [report],
        } as Partial<WebsiteScanResult>;
        await this.websiteScanResultProvider.mergeOrCreate(pageScanResult.id, updatedWebsiteScanResults);

        if (report) {
            if (pageScanResult.reports) {
                pageScanResult.reports.push(report);
            } else {
                pageScanResult.reports = [report];
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

    private async getCombinedReport(blobId: string | undefined): Promise<PrivacyReportReadResponse | undefined> {
        if (blobId === undefined) {
            this.logger.logInfo('No combined privacy scan results blob associated with this website scan. Creating a new blob.');

            return undefined;
        }

        const readResponse = await this.combinedReportProvider.readCombinedReport(blobId);
        if (readResponse.error) {
            if (readResponse.error.errorCode === 'blobNotFound') {
                this.logger.logWarn('Combined privacy scan results not found in a blob storage. Creating a new blob.');

                return undefined;
            }

            this.logger.logError('Failed to read combined privacy results blob.', {
                error: JSON.stringify(readResponse.error),
            });

            throw new Error(
                `Failed to read combined privacy results blob. Blob Id: ${blobId} Error: ${JSON.stringify(readResponse.error)}`,
            );
        }

        this.logger.logInfo('Successfully retrieved combined privacy scan results from a blob storage.');

        return readResponse;
    }

    private async writeCombinedReport(
        reportId: string,
        combinedReport: PrivacyScanCombinedReport,
        etag?: string,
    ): Promise<OnDemandPageScanReport> {
        const writeResponse = await this.combinedReportProvider.writeCombinedReport(
            {
                id: reportId,
                content: JSON.stringify(combinedReport),
                format: 'consolidated.json',
            },
            etag,
        );
        if (writeResponse.error) {
            this.logger.logError('Failed to write new combined privacy scan results blob.', {
                error: JSON.stringify(writeResponse.error),
            });

            throw new Error(
                `Failed to write new combined privacy scan results blob. Blob Id: ${reportId} Error: ${JSON.stringify(
                    writeResponse.error,
                )}`,
            );
        }

        this.logger.logInfo(`The '${writeResponse.report.format}' report saved to a blob storage.`, {
            reportId: writeResponse.report.reportId,
            blobUrl: writeResponse.report.href,
        });

        return writeResponse.report;
    }
}
