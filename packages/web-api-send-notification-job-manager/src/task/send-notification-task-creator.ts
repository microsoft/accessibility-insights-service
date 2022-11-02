// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Batch, BatchConfig, Message, Queue, StorageConfig } from 'azure-services';
import { ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { BatchTaskCreator, ScanMessage } from 'service-library';
import { OnDemandNotificationRequestMessage } from 'storage-documents';

@injectable()
export class SendNotificationTaskCreator extends BatchTaskCreator {
    protected jobGroup: string;

    public constructor(
        @inject(Batch) public readonly batch: Batch,
        @inject(Queue) private readonly queue: Queue,
        @inject(BatchConfig) public readonly batchConfig: BatchConfig,
        @inject(ServiceConfiguration) public readonly serviceConfig: ServiceConfiguration,
        @inject(StorageConfig) private readonly storageConfig: StorageConfig,
        @inject(GlobalLogger) public readonly logger: GlobalLogger,
        system: typeof System = System,
    ) {
        super(batch, batchConfig, serviceConfig, logger, system);
    }

    public async init(): Promise<void> {
        await super.init();
        this.jobGroup = this.jobManagerConfig.sendNotificationJobGroup;
    }

    public async getMessagesForTaskCreation(): Promise<ScanMessage[]> {
        const pendingTasks = await this.getJobPendingTasksCount();
        const messagesCount = this.jobManagerConfig.sendNotificationTasksCount - pendingTasks;
        if (messagesCount < 1) {
            return [];
        }

        const queueMessages = await this.queue.getMessagesWithTotalCount(this.getQueueName(), messagesCount);

        return this.convertToScanMessages(queueMessages);
    }

    public getQueueName(): string {
        return this.storageConfig.notificationQueue;
    }

    public async deleteSucceededRequest?(scanMessage: ScanMessage): Promise<void> {
        await this.queue.deleteMessage(this.getQueueName(), scanMessage.message);
    }

    private convertToScanMessages(messages: Message[]): ScanMessage[] {
        return messages.map((message) => {
            return {
                scanId: this.parseMessageBody(message).scanId,
                messageId: message.messageId,
                message: message,
            };
        });
    }

    private parseMessageBody(message: Message): OnDemandNotificationRequestMessage {
        return message.messageText === undefined ? undefined : (JSON.parse(message.messageText) as OnDemandNotificationRequestMessage);
    }
}
