import * as azure from 'azure-storage';
import { VError } from 'verror';
import { StorageConfig } from './storage-config';
import { Message } from './message';

export class Queue {
    public readonly scanQueue: string = this.config.scanQueue;

    constructor(private readonly config: StorageConfig, private readonly queueClient?: azure.QueueService) {
        if (!queueClient) {
            queueClient = azure
                .createQueueService(this.config.accountName, this.config.accountKey)
                .withFilter(new azure.ExponentialRetryPolicyFilter());
            queueClient.messageEncoder = new azure.QueueMessageEncoder.TextBase64QueueMessageEncoder();
        }
    }

    public async getMessages(queue: string = this.scanQueue): Promise<Message[]> {
        const maxDequeueCount = 2;
        const messages: Message[] = [];

        return this.getQueueMessages(queue).then(serverMessages => {
            serverMessages.forEach(serverMessage => {
                if (serverMessage.dequeueCount > maxDequeueCount) {
                    this.moveToDeadQueue(queue, serverMessage);
                    console.log(
                        `[${new Date().toJSON()}] Message ${
                            serverMessage.messageId
                        } exceeded dequeue threshold of ${maxDequeueCount} and moved to the ${queue}-dead queue.`,
                    );
                } else {
                    messages.push(new Message(serverMessage.messageText, serverMessage.messageId, serverMessage.popReceipt));
                }
            });

            return messages;
        });
    }

    public async moveToDeadQueue(originQueue: string, queueMessage: azure.QueueService.QueueMessageResult): Promise<void> {
        const targetQueue = `${originQueue}-dead`;
        return this.createQueueMessage(targetQueue, JSON.stringify(queueMessage.messageText)).then(() =>
            this.deleteQueueMessage(originQueue, queueMessage.messageId, queueMessage.popReceipt),
        );
    }

    public async deleteMessage(message: Message, queue: string = this.scanQueue): Promise<void> {
        return this.deleteQueueMessage(queue, message.messageId, message.popReceipt);
    }

    public async getQueueMessages(queue: string): Promise<azure.QueueService.QueueMessageResult[]> {
        const requestOptions = {
            numOfMessages: 32, // Maximum number of messages to retrieve from queue: 32
            visibilityTimeout: 300, // Message visibility timeout in seconds
        };

        return this.ensureQueueExists(queue).then(
            () =>
                new Promise<azure.QueueService.QueueMessageResult[]>((resolve, reject) => {
                    this.queueClient.getMessages(this.config.scanQueue, requestOptions, (error, serverMessages) => {
                        if (!error) {
                            resolve(serverMessages);
                        } else {
                            reject(new VError(error, `An error occurred while retrieving messages from queue ${this.config.scanQueue}`));
                        }
                    });
                }),
        );
    }

    public async createQueueMessage(queue: string, message: string): Promise<void> {
        return this.ensureQueueExists(queue).then(
            () =>
                new Promise<void>((resolve, reject) => {
                    this.queueClient.createMessage(queue, message, error => {
                        if (!error) {
                            resolve();
                        } else {
                            reject(new VError(error, `An error occurred while adding new message into queue ${queue}.`));
                        }
                    });
                }),
        );
    }

    public async deleteQueueMessage(queue: string, messageId: string, popReceipt: string): Promise<void> {
        return this.ensureQueueExists(queue).then(
            () =>
                new Promise<void>((resolve, reject) => {
                    this.queueClient.deleteMessage(queue, messageId, popReceipt, error => {
                        if (!error) {
                            resolve();
                        } else {
                            reject(new VError(error, `An error occurred while deleting message ${messageId} from queue ${queue}.`));
                        }
                    });
                }),
        );
    }

    public async ensureQueueExists(queue: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.queueClient.createQueueIfNotExists(queue, error => {
                if (!error) {
                    resolve();
                } else {
                    reject(new VError(error, `An error occurred while creating new queue ${queue}.`));
                }
            });
        });
    }
}
