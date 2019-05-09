import { injectable } from 'inversify';

@injectable()
export class StorageConfig {
    public readonly scanQueue: string = process.env.AZURE_STORAGE_SCAN_QUEUE;
}
