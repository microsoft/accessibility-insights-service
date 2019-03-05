import { StorageConfig } from './storage-config';

describe(StorageConfig, () => {
    let storageConfig: StorageConfig;

    it('return value of AZURE_STORAGE_ACCOUNT environment variable', () => {
        const value: string = `value-${Math.random}`;
        process.env.AZURE_STORAGE_ACCOUNT = value;
        storageConfig = new StorageConfig();

        expect(storageConfig.accountName).toEqual(value);
    });

    it('return value of AZURE_STORAGE_ACCESS_KEY environment variable', () => {
        const value: string = `value-${Math.random}`;
        process.env.AZURE_STORAGE_ACCESS_KEY = value;
        storageConfig = new StorageConfig();

        expect(storageConfig.accountKey).toEqual(value);
    });

    it('return value of AZURE_STORAGE_SCAN_QUEUE environment variable', () => {
        const value: string = `value-${Math.random}`;
        process.env.AZURE_STORAGE_SCAN_QUEUE = value;
        storageConfig = new StorageConfig();

        expect(storageConfig.scanQueue).toEqual(value);
    });
});
