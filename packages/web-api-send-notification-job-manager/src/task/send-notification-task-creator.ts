// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Batch, BatchConfig, Queue } from 'azure-services';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';

@injectable()
export class SendNotificationTaskCreator {
    public constructor(
        @inject(Batch) private readonly batch: Batch,
        @inject(Queue) private readonly queue: Queue,
        @inject(BatchConfig) private readonly batchConfig: BatchConfig,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async run(): Promise<void> {
        this.logger.logWarn('not implemented');
    }
}
