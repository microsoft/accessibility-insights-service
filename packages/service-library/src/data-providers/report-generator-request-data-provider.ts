// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosContainerClient, cosmosContainerClientTypes, CosmosOperationResponse, client } from 'azure-services';
import { inject, injectable } from 'inversify';
import { ItemType, ReportGeneratorRequest, TargetReport } from 'storage-documents';
import pLimit from 'p-limit';
import { GlobalLogger } from 'logger';
import { System } from 'common';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { OperationResult } from './operation-result';

export interface ScanReportGroup {
    scanCount: number;
    scanGroupId: string;
    targetReport: TargetReport;
}

@injectable()
export class ReportGeneratorRequestProvider {
    public maxConcurrencyLimit = 5;

    constructor(
        @inject(cosmosContainerClientTypes.OnDemandScanRequestsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async readRequests(
        scanGroupId: string,
        itemCount: number = 100,
        continuationToken?: string,
    ): Promise<CosmosOperationResponse<ReportGeneratorRequest[]>> {
        const query = {
            query: 'SELECT TOP @itemCount * FROM c WHERE c.itemType = @itemType AND c.scanGroupId = @scanGroupId ORDER BY c.priority DESC',
            parameters: [
                {
                    name: '@itemCount',
                    value: itemCount,
                },
                {
                    name: '@itemType',
                    value: ItemType.reportGeneratorRequest,
                },
                {
                    name: '@scanGroupId',
                    value: scanGroupId,
                },
            ],
        };

        return this.cosmosContainerClient.queryDocuments<ReportGeneratorRequest>(query, continuationToken);
    }

    public async readScanGroupIds(
        itemCount: number = 100,
        continuationToken?: string,
    ): Promise<CosmosOperationResponse<ScanReportGroup[]>> {
        const query = {
            query: 'SELECT TOP @itemCount COUNT(1) as scanCount, t.scanGroupId, t.targetReport FROM (SELECT * FROM c WHERE c.itemType = @itemType) t GROUP BY t.scanGroupId, t.targetReport',
            parameters: [
                {
                    name: '@itemCount',
                    value: itemCount,
                },
                {
                    name: '@itemType',
                    value: ItemType.reportGeneratorRequest,
                },
            ],
        };

        return this.cosmosContainerClient.queryDocuments<ScanReportGroup>(query, continuationToken);
    }

    public async writeRequest(request: Partial<ReportGeneratorRequest>): Promise<ReportGeneratorRequest> {
        if (request.id === undefined) {
            throw new Error(`Cannot write report generator request document without id: ${JSON.stringify(request)}`);
        }

        const persistedResult = request as ReportGeneratorRequest;
        this.setSystemProperties(persistedResult);
        const operationResponse = this.cosmosContainerClient.mergeOrWriteDocument(persistedResult);

        return (await operationResponse).item;
    }

    public async deleteRequests(ids: string[]): Promise<void> {
        const limit = pLimit(this.maxConcurrencyLimit);
        await Promise.all(
            ids.map(async (id) => {
                return limit(async () => this.cosmosContainerClient.deleteDocument(id, this.getPartitionKey(id)));
            }),
        );
    }

    public async tryUpdateRequests(requests: Partial<ReportGeneratorRequest>[]): Promise<OperationResult<ReportGeneratorRequest>[]> {
        const limit = pLimit(this.maxConcurrencyLimit);

        return Promise.all(
            requests.map(async (request) => {
                return limit(async () => {
                    let operationResponse: OperationResult<ReportGeneratorRequest>;
                    try {
                        operationResponse = await this.tryUpdateRequest(request);
                    } catch (error) {
                        this.logger.logError('Failed to update report generator request document in a batch.', {
                            error: System.serializeError(error),
                        });
                        operationResponse = { succeeded: false };
                    }

                    return operationResponse.succeeded === true
                        ? operationResponse
                        : { succeeded: false, result: request as ReportGeneratorRequest };
                });
            }),
        );
    }

    public async tryUpdateRequest(request: Partial<ReportGeneratorRequest>): Promise<OperationResult<ReportGeneratorRequest>> {
        const operationResponse = await this.updateRequestImpl(request, false);
        if (client.isSuccessStatusCode(operationResponse)) {
            return { succeeded: true, result: operationResponse.item };
        } else if (operationResponse.statusCode === 412) {
            // HTTP 412 Precondition failure
            // The server rejects the operation when document has been updated by other process
            return { succeeded: false };
        } else {
            throw new Error(
                `Failed to update report generator request document. Scan Id: ${request.id} Response status code: ${operationResponse.statusCode} Response: ${operationResponse.response}`,
            );
        }
    }

    private async updateRequestImpl(
        request: Partial<ReportGeneratorRequest>,
        throwIfNotSuccess: boolean,
    ): Promise<CosmosOperationResponse<ReportGeneratorRequest>> {
        if (request.id === undefined) {
            throw new Error(`Cannot update report generator request document without id: ${JSON.stringify(request)}`);
        }
        const persistedResult = request as ReportGeneratorRequest;
        this.setSystemProperties(persistedResult);

        return this.cosmosContainerClient.mergeOrWriteDocument(persistedResult, undefined, throwIfNotSuccess);
    }

    private setSystemProperties(request: ReportGeneratorRequest): void {
        request.itemType = ItemType.reportGeneratorRequest;
        request.partitionKey = this.getPartitionKey(request.id);
    }

    private getPartitionKey(id: string): string {
        return this.partitionKeyFactory.createPartitionKeyForDocument(ItemType.reportGeneratorRequest, id);
    }
}
