import { CosmosClient } from '@azure/cosmos';
import { KeyVaultClient } from 'azure-keyvault';
import { QueueService } from 'azure-storage';

export const iocTypeNames = {
    AzureKeyVaultClientProvider: 'AzureKeyVaultClientProvider',
    AzureQueueServiceProvider: 'AzureQueueServiceProvider',
    CosmosClientProvider: 'CosmosClientProvider',
    msRestAzure: 'msRestAzure',
};

export type AzureKeyVaultClientProvider = () => Promise<KeyVaultClient>;
export type AzureQueueServiceProvider = () => Promise<QueueService>;
export type CosmosClientProvider = () => Promise<CosmosClient>;
