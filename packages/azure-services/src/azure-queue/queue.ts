// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as util from 'util';
import { QueueRuntimeConfig, RetryHelper, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { ContextAwareLogger } from 'logger';
import { DequeuedMessageItem, QueueClient, MessagesDequeueOptionalParams } from '@azure/storage-queue';
import { iocTypeNames, QueueServiceClientProvider } from '../ioc-types';
import { Message } from './message';

@injectable()
export class Queue {
    constructor(
        @inject(iocTypeNames.QueueServiceClientProvider) private readonly queueServiceClientProvider: QueueServiceClientProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) private readonly logger: ContextAwareLogger,
        @inject(RetryHelper) private readonly retryHelper: RetryHelper<void>,
        private readonly maxEnqueueRetryCount: number = 3,
        private readonly retryIntervalMilliseconds: number = 1000,
    ) {}

    /**
     * @param numberOfMessages - number of messages to dequeue. Maximum supported is 32 per call (limited by Azure storage service)
     */
    public async getMessages(queue: string, numberOfMessages: number = 32): Promise<Message[]> {
        const maxDequeueCount = (await this.getQueueConfig()).maxDequeueCount;
        const messages: Message[] = [];
        const queueClient = await this.getQueueClient(queue);
        const deadQueueURL = await this.getQueueClient(`${queue}-dead`);

        await this.ensureQueueExists(queueClient);
        await this.ensureQueueExists(deadQueueURL);

        const serverMessages = await this.getQueueMessages(queueClient, numberOfMessages);
        for (const serverMessage of serverMessages) {
            if (serverMessage.dequeueCount > maxDequeueCount) {
                await this.moveToDeadQueue(queueClient, deadQueueURL, serverMessage);

                this.logger.logWarn(
                    `Storage queue message ${serverMessage.messageId} exceeded dequeue threshold of ${maxDequeueCount} and moved to the ${queue}-dead queue.`,
                );
            } else {
                messages.push(new Message(serverMessage.messageText, serverMessage.messageId, serverMessage.popReceipt));
            }
        }

        return messages;
    }

    public async getMessagesWithTotalCount(queue: string, totalMessagesCount: number): Promise<Message[]> {
        const messages: Message[] = [];
        do {
            const remainingMessagesCount = totalMessagesCount - messages.length;
            const currentBatchCount = remainingMessagesCount > 32 ? 32 : remainingMessagesCount;
            const batch = await this.getMessages(queue, currentBatchCount);

            if (batch.length === 0) {
                break;
            }
            messages.push(...batch);
        } while (messages.length < totalMessagesCount);

        return messages;
    }

    public async deleteMessage(queue: string, message: Message): Promise<void> {
        const queueURL = await this.getQueueClient(queue);

        return this.deleteQueueMessage(queueURL, message.messageId, message.popReceipt);
    }

    public async createMessage(queue: string, message: unknown): Promise<boolean> {
        try {
            await this.tryCreateMessage(queue, message);

            return true;
        } catch (error) {
            this.logger.logError(`Failed to create message in a queue storage: ${util.inspect(message)}. Error: ${util.inspect(error)}`);

            return false;
        }
    }

    public async getMessageCount(queue: string): Promise<number> {
        const queueClient = await this.getQueueClient(queue);
        const queueProperties = await queueClient.getProperties();

        return queueProperties.approximateMessagesCount;
    }

    public async createQueueMessage(queueClient: QueueClient, message: unknown): Promise<unknown> {
        const response = await queueClient.sendMessage(JSON.stringify(message));
        if (_.isNil(response) || _.isNil(response.messageId)) {
            throw new Error(`Enqueue failed with response: ${util.inspect(response)}`);
        }

        return message;
    }

    private async tryCreateMessage(queue: string, message: unknown): Promise<void> {
        return this.retryHelper.executeWithRetries(
            async () => {
                const queueURL = await this.getQueueClient(queue);
                await this.ensureQueueExists(queueURL);
                await this.createQueueMessage(queueURL, message);
            },
            async (error: Error) => {
                return;
            },
            this.maxEnqueueRetryCount,
            this.retryIntervalMilliseconds,
        );
    }

    private async ensureQueueExists(queueClient: QueueClient): Promise<void> {
        await queueClient.createIfNotExists();
    }

    private async deleteQueueMessage(queueClient: QueueClient, messageId: string, popReceipt: string): Promise<void> {
        try {
            await queueClient.deleteMessage(messageId, popReceipt);
        } catch (error) {
            this.logger.logError(`Failed to delete message in a queue storage: ${util.inspect(messageId)}. Error: ${util.inspect(error)}`);
        }
    }

    private async getQueueMessages(queueClient: QueueClient, numberOfMessages: number): Promise<DequeuedMessageItem[]> {
        const messageVisibilityTimeoutInSeconds = (await this.getQueueConfig()).messageVisibilityTimeoutInSeconds;
        const options: MessagesDequeueOptionalParams = { numberOfMessages, visibilityTimeout: messageVisibilityTimeoutInSeconds };
        const response = await queueClient.receiveMessages(options);

        return response.receivedMessageItems;
    }

    private async moveToDeadQueue(
        originQueueClient: QueueClient,
        deadQueueClient: QueueClient,
        queueMessage: DequeuedMessageItem,
    ): Promise<void> {
        await this.createQueueMessage(deadQueueClient, queueMessage.messageText);
        await this.deleteQueueMessage(originQueueClient, queueMessage.messageId, queueMessage.popReceipt);
    }

    private async getQueueClient(queueName: string): Promise<QueueClient> {
        return (await this.queueServiceClientProvider()).getQueueClient(queueName);
    }

    private async getQueueConfig(): Promise<QueueRuntimeConfig> {
        return this.serviceConfig.getConfigValue('queueConfig');
    }
}
