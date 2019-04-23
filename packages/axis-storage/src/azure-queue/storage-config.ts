import { injectable } from 'inversify';

@injectable()
export class StorageConfig {
    public readonly accountName: string = process.env.AZURE_STORAGE_ACCOUNT;
    public readonly accountKey: string = process.env.AZURE_STORAGE_ACCESS_KEY;
    public readonly scanQueue: string = process.env.AZURE_STORAGE_SCAN_QUEUE;
}
