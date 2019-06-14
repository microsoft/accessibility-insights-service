// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { StorageClient } from 'axis-storage';
import { inject, injectable } from 'inversify';

@injectable()
export class StorageTask {
    constructor(@inject(StorageClient) private readonly storageClient: StorageClient) {}

    public async writeResults<T>(results: T[], partitionKey?: string): Promise<void> {
        await this.storageClient.writeDocuments<T>(results, partitionKey);
    }

    public async writeResult<T>(result: T, partitionKey?: string): Promise<void> {
        await this.storageClient.writeDocument<T>(result, partitionKey);
    }

    public async mergeResults<T>(results: T[], partitionKey?: string): Promise<void> {
        await this.storageClient.mergeOrWriteDocuments<T>(results, partitionKey);
    }
}
