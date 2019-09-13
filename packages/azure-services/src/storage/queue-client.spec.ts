// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any no-unsafe-any
import 'reflect-metadata';

import { Logger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { Message } from '../azure-queue/message';
import { QueueWrapper } from '../azure-queue/queue-wrapper';
import { QueueClient } from './queue-client';

let queueClient: QueueClient;
let queueWrapperMock: IMock<QueueWrapper>;
let loggerMock: IMock<Logger>;
const queueName = 'testQueue';

beforeEach(() => {
    loggerMock = Mock.ofType(Logger);
    queueWrapperMock = Mock.ofType(QueueWrapper);
    queueClient = new QueueClient(queueWrapperMock.object, queueName, loggerMock.object);
});

describe('Queue client - Get Message count', () => {
    it('can get message count', async () => {
        queueWrapperMock
            .setup(async o => o.getMessageCount(queueName))
            .returns(async () => Promise.resolve(3))
            .verifiable(Times.once());

        const response = await queueClient.getMessageCount();

        expect(response).toEqual(3);
        queueWrapperMock.verifyAll();
    });
});

describe('Queue client - Create message', () => {
    it('Can create message with the correct params', async () => {
        const message = 'test message';
        queueWrapperMock
            .setup(async o => o.createMessage(queueName, message))
            .returns(async () => Promise.resolve(undefined))
            .verifiable(Times.once());

        await queueClient.createMessage(message);
        queueWrapperMock.verifyAll();
    });
});

describe('Queue client - Delete message', () => {
    it('can delete messages', async () => {
        const message = new Message('test message', 'test message id');
        queueWrapperMock
            .setup(async o => o.deleteMessage(message, queueName))
            .returns(async () => Promise.resolve(undefined))
            .verifiable(Times.once());

        await queueClient.deleteMessage(message);
        queueWrapperMock.verifyAll();
    });
});

describe('Queue Client - Get Messages', () => {
    it('can get messages', async () => {
        const message = new Message('test message', 'test message id');
        const returnMessages = [message, message];
        queueWrapperMock
            .setup(async o => o.getMessages(queueName))
            .returns(async () => Promise.resolve(returnMessages))
            .verifiable(Times.once());

        const resp = await queueClient.getMessages();

        expect(resp).toEqual(returnMessages);
        queueWrapperMock.verifyAll();
    });
});

describe('Queue Client - Get Queue name', () => {
    it('returns the correct name', async () => {
        const resp = queueClient.getScanQueue;
        expect(resp).toEqual(queueName);
    });
});
