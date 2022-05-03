// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import axe from 'axe-core';
import { AxeResultsReducer, UrlCount } from 'axe-result-converter';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { CombinedScanResults, PageScan } from 'storage-documents';
import { CombinedScanResultsProvider } from '../data-providers/combined-scan-results-provider';
import { CombinedResultsBlob } from './combined-results-blob-provider';

@injectable()
export class CombinedAxeResultBuilder {
    public constructor(
        @inject(AxeResultsReducer) protected readonly axeResultsReducer: AxeResultsReducer,
        @inject(CombinedScanResultsProvider) protected readonly combinedScanResultsProvider: CombinedScanResultsProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async mergeAxeResults(
        axeScanResults: axe.AxeResults,
        combinedResultsBlobInfo: CombinedResultsBlob,
        pageScans: PageScan[],
    ): Promise<CombinedScanResults> {
        const combinedResultsBlobId = combinedResultsBlobInfo.blobId;
        const blobReadResponse = combinedResultsBlobInfo.response;
        const combinedScanResults = blobReadResponse.results;

        combinedScanResults.urlCount = this.getScannedUrlCount(pageScans);

        this.axeResultsReducer.reduce(combinedScanResults.axeResults, axeScanResults);
        const blobWriteResponse = await this.combinedScanResultsProvider.writeCombinedResults(
            combinedResultsBlobId,
            combinedScanResults,
            blobReadResponse.etag,
        );

        if (blobWriteResponse.error) {
            this.logger.logError('Failed to write new combined axe scan results blob.', {
                error: JSON.stringify(blobWriteResponse.error),
            });

            throw new Error(
                `Failed to write new combined axe scan results blob. Blob Id: ${combinedResultsBlobId} Error: ${JSON.stringify(
                    blobWriteResponse.error,
                )}`,
            );
        }

        return combinedScanResults;
    }

    private getScannedUrlCount(pageScans: PageScan[]): UrlCount {
        if (pageScans === undefined) {
            return {
                total: 0,
                failed: 0,
                passed: 0,
            };
        }

        const passed = pageScans.filter((s) => s?.scanState === 'pass').length;
        const failed = pageScans.filter((s) => s?.scanState === 'fail').length;

        return {
            total: passed + failed,
            failed,
            passed,
        };
    }
}
