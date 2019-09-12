// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as _ from 'lodash';
import { Logger } from 'logger';
import { Message } from '../azure-queue/message';
import { QueueWrapper } from '../azure-queue/queue-wrapper';

export class QueueClient {
    constructor(private readonly queueWrapper: QueueWrapper, private readonly queueName: string, private readonly logger: Logger) {}

    public async createMessage(message: unknown): Promise<void> {
        return this.queueWrapper.createMessage(this.queueName, message);
    }

    public async deleteMessage(message: Message): Promise<void> {
        return this.queueWrapper.deleteMessage(message, this.queueName);
    }

    public async getMessageCount(): Promise<number> {
        return this.queueWrapper.getMessageCount(this.queueName);
    }

    public async getMessages(): Promise<Message[]> {
        return this.queueWrapper.getMessages(this.queueName);
    }

    public get getScanQueue(): string {
        return this.queueName;
    }
}
