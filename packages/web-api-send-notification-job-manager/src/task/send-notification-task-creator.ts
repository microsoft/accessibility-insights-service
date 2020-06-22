// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Batch, BatchConfig, JobTask, Message, Queue, StorageConfig } from 'azure-services';
import { ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { BatchTaskCreator } from 'service-library';

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

    protected async getMessagesForTaskCreation(): Promise<Message[]> {
        const pendingTasks = await this.getJobPendingTasksCount();
        const messagesCount = this.jobManagerConfig.sendNotificationTasksCount - pendingTasks;
        if (messagesCount > 0) {
            return this.queue.getMessagesWithTotalCount(this.getQueueName(), messagesCount);
        }

        return [];
    }

    // tslint:disable-next-line: no-empty
    protected async onExit(): Promise<void> {}

    // tslint:disable-next-line: no-empty
    protected async onTasksAdded(tasks: JobTask[]): Promise<void> {}
}
