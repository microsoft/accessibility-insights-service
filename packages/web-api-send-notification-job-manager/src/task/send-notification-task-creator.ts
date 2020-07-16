// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Batch, BatchConfig, BatchTask, JobTask, Message, Queue, StorageConfig } from 'azure-services';
import { ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { BatchTaskCreator, ScanMessage } from 'service-library';
import { OnDemandNotificationRequestMessage } from 'storage-documents';

@injectable()
export class SendNotificationTaskCreator extends BatchTaskCreator {
    public constructor(
        @inject(Batch) batch: Batch,
        @inject(Queue) queue: Queue,
        @inject(BatchConfig) batchConfig: BatchConfig,
        @inject(ServiceConfiguration) serviceConfig: ServiceConfiguration,
        @inject(StorageConfig) private readonly storageConfig: StorageConfig,
        @inject(GlobalLogger) logger: GlobalLogger,
        system: typeof System = System,
    ) {
        super(batch, queue, batchConfig, serviceConfig, logger, system);
    }

    public getQueueName(): string {
        return this.storageConfig.notificationQueue;
    }

    protected async getMessagesForTaskCreation(): Promise<ScanMessage[]> {
        const pendingTasks = await this.getJobPendingTasksCount();
        const messagesCount = this.jobManagerConfig.sendNotificationTasksCount - pendingTasks;
        if (messagesCount < 1) {
            return [];
        }

        const queueMessages = await this.queue.getMessagesWithTotalCount(this.getQueueName(), messagesCount);

        return this.convertToScanMessages(queueMessages);
    }

    // tslint:disable-next-line: no-empty
    protected async handleFailedTasks(failedTasks: BatchTask[]): Promise<void> {}

    // tslint:disable-next-line: no-empty
    protected async onExit(): Promise<void> {}

    // tslint:disable-next-line: no-empty
    protected async onTasksAdded(tasks: JobTask[]): Promise<void> {}

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
