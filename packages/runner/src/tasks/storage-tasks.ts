import { StorageClient } from '../storage/storage-client';

export class StorageTask {
    public async storeResults<T>(scanResults: T[]): Promise<void> {
        const storageClient = new StorageClient();
        await storageClient.storeResults(scanResults);
    }

    public async storeResult<T>(scanResults: T): Promise<void> {
        const storageClient = new StorageClient();
        await storageClient.storeResults([scanResults]);
    }
}
