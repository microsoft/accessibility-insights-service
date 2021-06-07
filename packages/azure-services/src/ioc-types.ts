// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BatchServiceClient } from '@azure/batch';
import { CosmosClient } from '@azure/cosmos';
import { SecretClient } from '@azure/keyvault-secrets';
import { BlobServiceClient } from '@azure/storage-blob';
import { QueueServiceClient } from '@azure/storage-queue';

export const iocTypeNames = {
    AzureKeyVaultClientProvider: 'AzureKeyVaultClientProvider',
    BlobServiceClientProvider: 'BlobServiceClientProvider',
    CosmosClientProvider: 'CosmosClientProvider',
    msRestAzure: 'msRestAzure',
    QueueServiceClientProvider: 'QueueServiceClientProvider',
    AuthenticationMethod: 'AuthenticationMethod',
    CredentialType: 'CredentialType',
    BatchServiceClientProvider: 'BatchServiceClientProvider',
};

export type AzureKeyVaultClientProvider = () => Promise<SecretClient>;
export type BlobServiceClientProvider = () => Promise<BlobServiceClient>;
export type CosmosClientProvider = () => Promise<CosmosClient>;
export type QueueServiceClientProvider = () => Promise<QueueServiceClient>;
export type BatchServiceClientProvider = () => Promise<BatchServiceClient>;

export const cosmosContainerClientTypes = {
    OnDemandScanBatchRequestsCosmosContainerClient: 'onDemandScanBatchRequestsCosmosContainerClient',
    OnDemandScanRunsCosmosContainerClient: 'onDemandScanRunsCosmosContainerClient',
    OnDemandScanRequestsCosmosContainerClient: 'onDemandScanRequestsCosmosContainerClient',
    OnDemandSystemDataCosmosContainerClient: 'onDemandSystemDataCosmosContainerClient',
};
