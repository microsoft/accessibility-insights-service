// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Batch, BatchConfig, JobTask, Message, Queue } from 'azure-services';
import { ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { BatchTaskCreator } from 'service-library';

@injectable()
export class SendNotificationTaskCreator extends BatchTaskCreator {
    public constructor(
        @inject(Batch) batch: Batch,
        @inject(Queue) queue: Queue,
        @inject(BatchConfig) batchConfig: BatchConfig,
        @inject(ServiceConfiguration) serviceConfig: ServiceConfiguration,
        @inject(Logger) logger: Logger,
        system: typeof System = System,
    ) {
        super(batch, queue, batchConfig, serviceConfig, logger, system);
    }

    protected async getMessagesForTaskCreation(): Promise<Message[]> {
        const poolMetricsInfo = await this.batch.getPoolMetricsInfo();

        const messagesCount = this.jobManagerConfig.sendNotificationTasksCount - this.getChildTasksCount(poolMetricsInfo);
        if (messagesCount > 0) {
            return this.queue.getMessagesWithTotalCount(messagesCount);
        }

        return [];
    }

    // tslint:disable-next-line: no-empty
    protected async onExit(): Promise<void> {}

    // tslint:disable-next-line: no-empty
    protected async onTasksAdded(tasks: JobTask[]): Promise<void> {}
}
