// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import axe from 'axe-core';
import { AxeResultsReducer } from 'axe-result-converter';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { CombinedScanResultsProvider } from 'service-library';
import { CombinedScanResults } from 'storage-documents';
import { CombinedResultsBlobInfo } from './combined-results-blob-getter';

@injectable()
export class AxeResultMerger {
    public constructor(
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(CombinedScanResultsProvider) protected readonly combinedScanResultsProvider: CombinedScanResultsProvider,
        @inject(AxeResultsReducer) protected readonly axeResultsReducer: AxeResultsReducer,
    ) {}

    public async mergeAxeResults(
        axeScanResults: axe.AxeResults,
        combinedResultsBlobInfo: CombinedResultsBlobInfo,
    ): Promise<CombinedScanResults> {
        const combinedResultsBlobId = combinedResultsBlobInfo.blobId;
        const blobReadResponse = combinedResultsBlobInfo.response;
        const combinedScanResults = blobReadResponse.results;

        combinedScanResults.urlCount.total++;
        if (axeScanResults.violations.length > 0) {
            combinedScanResults.urlCount.failed++;
        } else {
            combinedScanResults.urlCount.passed++;
        }

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
}
