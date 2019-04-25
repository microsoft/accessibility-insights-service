import { StorageClient } from 'axis-storage';
import { inject, injectable } from 'inversify';

@injectable()
export class StorageTask {
    constructor(@inject(StorageClient) private readonly storageClient: StorageClient) {}

    public async storeResults<T>(results: T[]): Promise<void> {
        await this.storageClient.writeDocuments<T>(results);
    }

    public async storeResult<T>(result: T): Promise<void> {
        await this.storageClient.writeDocument<T>(result);
    }
}
