import { inject } from 'inversify';
import { StorageClient } from '../storage/storage-client';

export class StorageTask {
    constructor(@inject(StorageClient) private readonly storageClient: StorageClient) {}

    public async storeResults<T>(results: T[]): Promise<void> {
        await this.storageClient.storeResults(results);
    }

    public async storeResult<T>(result: T): Promise<void> {
        await this.storageClient.storeResults([result]);
    }
}
