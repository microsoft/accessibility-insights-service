// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { CombinedScanResultsProvider, CombinedScanResultsReadResponse } from 'service-library';

export interface CombinedResultsBlobInfo {
    response: CombinedScanResultsReadResponse;
    blobId: string;
}

@injectable()
export class CombinedResultsBlobGetter {
    public constructor(
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(CombinedScanResultsProvider) protected readonly combinedScanResultsProvider: CombinedScanResultsProvider,
    ) {}

    public async getBlobInfo(givenResultsBlobId: string): Promise<CombinedResultsBlobInfo> {
        let returnedResultsBlobId = givenResultsBlobId;
        let blobReadResponse: CombinedScanResultsReadResponse;

        if (givenResultsBlobId === undefined) {
            returnedResultsBlobId = this.guidGenerator.createGuid();
            this.logger.logInfo('No combined axe scan results blob associated with this website scan. Creating a new blob.');
            blobReadResponse = this.combinedScanResultsProvider.getEmptyResponse();
        } else {
            blobReadResponse = await this.getCombinedResultsBlob(returnedResultsBlobId);
        }

        return {
            response: blobReadResponse,
            blobId: returnedResultsBlobId,
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
