import * as azureStorage from 'azure-storage';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import { Logger } from 'logger';
import { VError } from 'verror';
import { AzureQueueServiceProvider, iocTypeNames } from '../ioc-types';
import { Message } from './message';
import { StorageConfig } from './storage-config';

@injectable()
export class Queue {
    public readonly scanQueue: string = this.config.scanQueue;

    constructor(
        @inject(StorageConfig) private readonly config: StorageConfig,
        @inject(iocTypeNames.AzureQueueServiceProvider) private readonly queueClientProvider: AzureQueueServiceProvider,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async getMessages(queue: string = this.scanQueue): Promise<Message[]> {
        const maxDequeueCount = 2;
        const messages: Message[] = [];

        const serverMessages = await this.getQueueMessages(queue);

        for (const serverMessage of serverMessages) {
            if (serverMessage.dequeueCount > maxDequeueCount) {
                await this.moveToDeadQueue(queue, serverMessage);

                this.logger.logWarn(
                    `[Queue] Message ${
                        serverMessage.messageId
                    } exceeded dequeue threshold of ${maxDequeueCount} and moved to the ${queue}-dead queue.`,
                );
            } else {
                messages.push(new Message(serverMessage.messageText, serverMessage.messageId, serverMessage.popReceipt));
            }
        }

        return messages;
    }

    public async moveToDeadQueue(originQueue: string, queueMessage: azureStorage.QueueService.QueueMessageResult): Promise<void> {
        const targetQueue = `${originQueue}-dead`;

        await this.createQueueMessage(targetQueue, JSON.stringify(queueMessage.messageText));
        await this.deleteQueueMessage(originQueue, queueMessage.messageId, queueMessage.popReceipt);
    }

    public async deleteMessage(message: Message, queue: string = this.scanQueue): Promise<void> {
        return this.deleteQueueMessage(queue, message.messageId, message.popReceipt);
    }

    public async getQueueMessages(queue: string): Promise<azureStorage.QueueService.QueueMessageResult[]> {
        const requestOptions = {
            numOfMessages: 32, // Maximum number of messages to retrieve from queue: 32
            visibilityTimeout: 300, // Message visibility timeout in seconds
        };

        await this.ensureQueueExists(queue);

        const client = await this.queueClientProvider();

        return new Promise<azureStorage.QueueService.QueueMessageResult[]>((resolve, reject) => {
            client.getMessages(this.config.scanQueue, requestOptions, (error, serverMessages) => {
                if (_.isNil(error)) {
                    resolve(serverMessages);
                } else {
                    reject(new VError(error, `An error occurred while retrieving messages from queue ${this.config.scanQueue}`));
                }
            });
        });
    }

    public async createQueueMessage(queue: string, message: string): Promise<void> {
        await this.ensureQueueExists(queue);

        const client = await this.queueClientProvider();

        return new Promise<void>((resolve, reject) => {
            client.createMessage(queue, message, error => {
                if (_.isNil(error)) {
                    resolve();
                } else {
                    reject(new VError(error, `An error occurred while adding new message into queue ${queue}.`));
                }
            });
        });
    }

    public async deleteQueueMessage(queue: string, messageId: string, popReceipt: string): Promise<void> {
        await this.ensureQueueExists(queue);

        const client = await this.queueClientProvider();

        return new Promise((resolve, reject) => {
            client.deleteMessage(queue, messageId, popReceipt, error => {
                if (_.isNil(error)) {
                    resolve();
                } else {
                    reject(new VError(error, `An error occurred while deleting message ${messageId} from queue ${queue}.`));
                }
            });
        });
    }

    public async ensureQueueExists(queue: string): Promise<void> {
        const client = await this.queueClientProvider();

        return new Promise<void>((resolve, reject) => {
            client.createQueueIfNotExists(queue, error => {
                if (_.isNil(error)) {
                    resolve();
                } else {
                    reject(new VError(error, `An error occurred while creating new queue ${queue}.`));
                }
            });
        });
    }
}
