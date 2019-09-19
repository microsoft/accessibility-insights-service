// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosClient } from '@azure/cosmos';
import { KeyVaultClient } from '@azure/keyvault';
import { BlobServiceClient } from '@azure/storage-blob';
import { MessageIdURL, MessagesURL, QueueURL, ServiceURL } from '@azure/storage-queue';

export const iocTypeNames = {
    AzureKeyVaultClientProvider: 'AzureKeyVaultClientProvider',
    BlobServiceClientProvider: 'BlobServiceClientProvider',
    QueueURLProvider: 'QueueURLProvider',
    MessagesURLProvider: 'MessagesURLProvider',
    MessageIdURLProvider: 'MessageIdURLProvider',
    CosmosClientProvider: 'CosmosClientProvider',
    msRestAzure: 'msRestAzure',
    QueueServiceURLProvider: 'QueueServiceURLProvider',
    AuthenticationMethod: 'AuthenticationMethod',
    CredentialType: 'CredentialType',
};

export type AzureKeyVaultClientProvider = () => Promise<KeyVaultClient>;
export type BlobServiceClientProvider = () => Promise<BlobServiceClient>;
export type CosmosClientProvider = () => Promise<CosmosClient>;
export type QueueURLProvider = typeof QueueURL.fromServiceURL;
export type MessagesURLProvider = typeof MessagesURL.fromQueueURL;
export type MessageIdURLProvider = typeof MessageIdURL.fromMessagesURL;
export type QueueServiceURLProvider = () => Promise<ServiceURL>;

export const cosmosContainerClientTypes = {
    A11yIssuesCosmosContainerClient: 'a11yIssuesCosmosContainerClient',
    OnDemandScanBatchRequestsCosmosContainerClient: 'onDemandScanBatchRequestsCosmosContainerClient',
    OnDemandScanRunsCosmosContainerClient: 'onDemandScanRunsCosmosContainerClient',
    OnDemandScanRequestsCosmosContainerClient: 'onDemandScanRequestsCosmosContainerClient',
};
