// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BatchServiceClient } from '@azure/batch';
import { CosmosClient } from '@azure/cosmos';
import { SecretClient } from '@azure/keyvault-secrets';
import { BlobServiceClient } from '@azure/storage-blob';
import { QueueServiceClient } from '@azure/storage-queue';
import { ServicePrincipalCredential } from './credentials/service-principal-credential';

export const iocTypeNames = {
    AzureKeyVaultClientProvider: 'AzureKeyVaultClientProvider',
    BlobServiceClientProvider: 'BlobServiceClientProvider',
    CosmosClientProvider: 'CosmosClientProvider',
    QueueServiceClientProvider: 'QueueServiceClientProvider',
    BatchServiceClientProvider: 'BatchServiceClientProvider',
    msRestAzure: 'msRestAzure',
    AuthenticationMethod: 'AuthenticationMethod',
    CredentialType: 'CredentialType',
    StorageCredential: 'StorageCredential',
    CosmosCredential: 'CosmosCredential',
    AzureAuthClientCredentialProvider: 'azureAuthClientCredentialProvider',
};

export type AzureKeyVaultClientProvider = () => Promise<SecretClient>;
export type BlobServiceClientProvider = () => Promise<BlobServiceClient>;
export type CosmosClientProvider = () => Promise<CosmosClient>;
export type QueueServiceClientProvider = () => Promise<QueueServiceClient>;
export type BatchServiceClientProvider = () => Promise<BatchServiceClient>;
export type AzureAuthClientCredentialProvider = () => Promise<ServicePrincipalCredential>;

export const cosmosContainerClientTypes = {
    OnDemandScanBatchRequestsCosmosContainerClient: 'onDemandScanBatchRequestsCosmosContainerClient',
    OnDemandScanRunsCosmosContainerClient: 'onDemandScanRunsCosmosContainerClient',
    OnDemandScanRequestsCosmosContainerClient: 'onDemandScanRequestsCosmosContainerClient',
    OnDemandSystemDataCosmosContainerClient: 'onDemandSystemDataCosmosContainerClient',
};
