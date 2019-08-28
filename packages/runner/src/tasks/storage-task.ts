// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { inject, injectable } from 'inversify';

@injectable()
export class StorageTask {
    constructor(
        @inject(cosmosContainerClientTypes.A11yIssuesCosmosContainerClient) private readonly cosmosContainerClient: CosmosContainerClient,
    ) {}

    public async writeResults<T>(results: T[], partitionKey?: string): Promise<void> {
        await this.cosmosContainerClient.writeDocuments<T>(results, partitionKey);
    }

    public async writeResult<T>(result: T, partitionKey?: string): Promise<void> {
        await this.cosmosContainerClient.writeDocument<T>(result, partitionKey);
    }

    public async mergeResults<T>(results: T[], partitionKey?: string): Promise<void> {
        await this.cosmosContainerClient.mergeOrWriteDocuments<T>(results, partitionKey);
    }
}
