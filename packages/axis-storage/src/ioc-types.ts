import { CosmosClient } from '@azure/cosmos';
import { KeyVaultClient } from 'azure-keyvault';
import { QueueService } from 'azure-storage';
import * as msrestAzure from 'ms-rest-azure';

export type Credentials = msrestAzure.MSIVmTokenCredentials | msrestAzure.ApplicationTokenCredentials;

export const iocTypeNames = {
    AzureKeyVaultClientProvider: 'AzureKeyvaultClientProvider',
    CredentialsProvider: 'CredentialsProvider',
    AzureQueueServiceProvider: 'AzureQueueServiceProvider',
    CosmosClientProvider: 'CosmosClientProvider',
};

export type AzureKeyVaultClientProvider = () => Promise<KeyVaultClient>;
export type CredentialsProvider = () => Promise<Credentials>;
export type AzureQueueServiceProvider = () => Promise<QueueService>;
export type CosmosClientProvider = () => Promise<CosmosClient>;
