// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { CombinedScanResultsProvider, CombinedScanResultsReadResponse } from 'service-library';
import { CombinedResultsBlob } from '../types/combined-results-blob';

@injectable()
export class CombinedResultsBlobProvider {
    public constructor(
        @inject(CombinedScanResultsProvider) protected readonly combinedScanResultsProvider: CombinedScanResultsProvider,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async getBlob(existingCombinedResultsBlobId: string | undefined): Promise<CombinedResultsBlob> {
        let actualBlobId = existingCombinedResultsBlobId;
        let blobReadResponse: CombinedScanResultsReadResponse;

        if (existingCombinedResultsBlobId === undefined) {
            actualBlobId = this.guidGenerator.createGuid();
            this.logger.logInfo('No combined axe scan results blob associated with this website scan. Creating a new blob.');
            blobReadResponse = this.combinedScanResultsProvider.getEmptyResponse();
        } else {
            blobReadResponse = await this.getCombinedResultsBlob(actualBlobId);
        }

        return {
            response: blobReadResponse,
            blobId: actualBlobId,
        };
    }

    private async getCombinedResultsBlob(combinedResultsBlobId: string | undefined): Promise<CombinedScanResultsReadResponse> {
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
