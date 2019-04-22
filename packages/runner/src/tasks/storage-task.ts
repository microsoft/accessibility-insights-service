import { StorageClient } from 'axis-storage';
import { inject } from 'inversify';

export class StorageTask {
    constructor(@inject(StorageClient) private readonly storageClient: StorageClient) {}

    public async storeResults<T>(results: T[]): Promise<void> {
        await this.storageClient.writeDocuments<T>(results);
    }

    public async storeResult<T>(result: T): Promise<void> {
        await this.storageClient.writeDocument<T>(result);
    }
}
