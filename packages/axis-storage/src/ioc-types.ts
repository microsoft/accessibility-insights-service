import { CosmosClient } from '@azure/cosmos';
import { KeyVaultClient } from '@azure/keyvault';
import { MessageIdURL, MessagesURL, QueueURL, ServiceURL } from '@azure/storage-queue';

export const iocTypeNames = {
    AzureKeyVaultClientProvider: 'AzureKeyVaultClientProvider',
    QueueURLProvider: 'QueueURLProvider',
    MessagesURLProvider: 'MessagesURLProvider',
    MessageIdURLProvider: 'MessageIdURLProvider',
    CosmosClientProvider: 'CosmosClientProvider',
    msRestAzure: 'msRestAzure',
    QueueServiceURLProvider: 'QueueServiceURLProvider',
};

export type AzureKeyVaultClientProvider = () => Promise<KeyVaultClient>;
export type CosmosClientProvider = () => Promise<CosmosClient>;
export type QueueURLProvider = typeof QueueURL.fromServiceURL;
export type MessagesURLProvider = typeof MessagesURL.fromQueueURL;
export type MessageIdURLProvider = typeof MessageIdURL.fromMessagesURL;
export type QueueServiceURLProvider = () => Promise<ServiceURL>;
