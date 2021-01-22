// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import axe from 'axe-core';
import { AxeResultsReducer } from 'axe-result-converter';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { CombinedScanResultsProvider, CombinedScanResultsReadResponse } from 'service-library';
import { CombinedScanResults } from 'storage-documents';

@injectable()
export class AxeResultMerger {
    public constructor(
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(CombinedScanResultsProvider) protected readonly combinedScanResultsProvider: CombinedScanResultsProvider,
        @inject(AxeResultsReducer) protected readonly axeResultsReducer: AxeResultsReducer,
    ) {}

    public async mergeAxeResults(axeScanResults: axe.AxeResults, combinedResultsBlobId: string): Promise<CombinedScanResults> {
        const blobReadResponse = await this.getOrCreateCombinedResultsBlob(combinedResultsBlobId);
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

    private async getOrCreateCombinedResultsBlob(combinedResultsBlobId: string | undefined): Promise<CombinedScanResultsReadResponse> {
        if (combinedResultsBlobId === undefined) {
            this.logger.logInfo('No combined axe scan results blob associated with this website scan. Creating a new blob.');

            return this.combinedScanResultsProvider.getEmptyResponse();
        }

        const response = await this.combinedScanResultsProvider.readCombinedResults(combinedResultsBlobId);

        if (response.error) {
            if (response.error.errorCode === 'blobNotFound') {
                this.logger.logWarn('Combined axe scan results not found in a blob storage. Creating a new blob.');

                return this.combinedScanResultsProvider.getEmptyResponse();
            }

            this.logger.logError('Failed to read combined axe results blob.', {
                error: JSON.stringify(response.error),
            });

            throw new Error(
                `Failed to read combined axe results blob. Blob Id: ${combinedResultsBlobId} Error: ${JSON.stringify(response.error)}`,
            );
        }

        this.logger.logInfo('Successfully retrieved combined axe scan results from a blob storage.');

        return response;
    }
}
