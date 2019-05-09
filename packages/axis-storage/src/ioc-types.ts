import { KeyVaultClient } from 'azure-keyvault';
import { QueueService } from 'azure-storage';
import * as msrestAzure from 'ms-rest-azure';

export type Credentials = msrestAzure.MSIVmTokenCredentials | msrestAzure.ApplicationTokenCredentials;

export const iocTypeNames = {
    AzureKeyvaultClientProvider: 'AzureKeyvaultClientProvider',
    CredentialsProvider: 'CredentialsProvider',
    AzureQueueServiceProvider: 'AzureQueueServiceProvider',
};

export type AzureKeyvaultClientProvider = () => Promise<KeyVaultClient>;
export type CredentialsProvider = () => Promise<Credentials>;
export type AzureQueueServiceProvider = () => Promise<QueueService>;
