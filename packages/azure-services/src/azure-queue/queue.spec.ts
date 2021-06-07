// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { RetryHelper, ServiceConfiguration } from 'common';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import {
    DequeuedMessageItem,
    QueueClient,
    QueueGetPropertiesResponse,
    QueueReceiveMessageResponse,
    QueueServiceClient,
} from '@azure/storage-queue';
import { QueueServiceClientProvider } from '../ioc-types';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { Message } from './message';
import { Queue } from './queue';

/* eslint-disable @typescript-eslint/no-explicit-any,
   @typescript-eslint/consistent-type-assertions,
   no-empty,
   @typescript-eslint/no-empty-function
*/

describe(Queue, () => {
    const messageVisibilityTimeout = 30;
    let queue: string;
    let testSubject: Queue;
    let queueServiceClientProviderMock: IMock<QueueServiceClientProvider>;
    let loggerMock: IMock<MockableLogger>;
    let queueServiceClientMock: IMock<QueueServiceClient>;
    let queueClientMock: IMock<QueueClient>;
    let deadQueueClientMock: IMock<QueueClient>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let retryHelperMock: IMock<RetryHelper<void>>;
    const maxAttempts = 3;

    beforeEach(() => {
        queue = 'queue-1';
        queueServiceClientProviderMock = Mock.ofInstance((() => {}) as any);
        retryHelperMock = Mock.ofType<RetryHelper<void>>();

        queueServiceClientMock = Mock.ofType<QueueServiceClient>();
        queueClientMock = Mock.ofType<QueueClient>();
        deadQueueClientMock = Mock.ofType<QueueClient>();
        loggerMock = Mock.ofType(MockableLogger);
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async (s) => s.getConfigValue('queueConfig'))
            .returns(async () =>
                Promise.resolve({
                    maxQueueSize: 10,
                    messageVisibilityTimeoutInSeconds: messageVisibilityTimeout,
                }),
            );

        getPromisableDynamicMock(queueServiceClientMock);
        getPromisableDynamicMock(queueClientMock);
        getPromisableDynamicMock(deadQueueClientMock);

        queueServiceClientProviderMock.setup(async (q) => q()).returns(async () => queueServiceClientMock.object);
        queueServiceClientMock.setup((q) => q.getQueueClient(queue)).returns(() => queueClientMock.object);
        queueServiceClientMock.setup((q) => q.getQueueClient(`${queue}-dead`)).returns(() => deadQueueClientMock.object);

        testSubject = new Queue(
            queueServiceClientProviderMock.object,
            serviceConfigMock.object,
            loggerMock.object,
            retryHelperMock.object,
            maxAttempts,
            0,
        );
    });

    describe('getMessages()', () => {
        it('get queue messages with low dequeue count', async () => {
            const toBeDequeuedMessage = {
                messageText: 'to be dequeued message text',
                messageId: 'to be dequeued message id',
                popReceipt: 'to be dequeued pop receipt',
                dequeueCount: 3,
            } as DequeuedMessageItem;
            const notDequeuedMessage = {
                messageText: 'messageText-1',
                messageId: 'messageId-1',
                popReceipt: 'popReceipt-1',
                dequeueCount: 1,
            } as DequeuedMessageItem;
            const queueMessageResults = [notDequeuedMessage, toBeDequeuedMessage];
            const actualQueueMessageResult = createMessagesFromServerMessages([notDequeuedMessage]);

            setupCreateQueuesIfNotExistsCall();

            setupVerifyCallToMoveMessageToDeadQueue(toBeDequeuedMessage);

            setupVerifyCallForDequeueMessage(queueMessageResults);

            const queueMessageResultActual = await testSubject.getMessages(queue);

            expect(queueMessageResultActual).toEqual(actualQueueMessageResult);

            verifyAll();
        });

        it('creates queue when not exists', async () => {
            const message = {
                messageText: 'messageText-1',
                messageId: 'messageId-1',
                popReceipt: 'popReceipt-1',
                dequeueCount: 1,
            } as DequeuedMessageItem;
            const queueMessageResults = [message];
            const actualQueueMessageResult = createMessagesFromServerMessages([message]);

            setupCreateQueuesIfNotExistsCall();

            setupVerifyCallForDequeueMessage(queueMessageResults);

            const queueMessageResultActual = await testSubject.getMessages(queue);

            expect(queueMessageResultActual).toEqual(actualQueueMessageResult);

            verifyAll();
        });
    });

    describe('getMessagesWithTotalCount', () => {
        let getMessagesMock: IMock<(queue: string, totalMessagesCount: number) => Promise<Message[]>>;
        let messageIdCounter = 0;

        beforeEach(() => {
            getMessagesMock = Mock.ofInstance(async () => Promise.resolve([]), MockBehavior.Strict);
            messageIdCounter = 0;

            (testSubject as any).getMessages = getMessagesMock.object;
        });

        afterEach(() => {
            getMessagesMock.verifyAll();
        });

        function generateMessages(totalCount: number): Message[] {
            const messages: Message[] = [];
            for (let count = 1; count <= totalCount; count += 1) {
                messageIdCounter += 1;
                messages.push({
                    messageId: `id-${messageIdCounter}`,
                    messageText: `message text for ${messageIdCounter}`,
                });
            }

            return messages;
        }

        it('makes multiple calls to get all results', async () => {
            getMessagesMock
                .setup((s) => s(queue, 32))
                .returns(async () => generateMessages(32))
                .verifiable(Times.once());

            getMessagesMock
                .setup((s) => s(queue, 3))
                .returns(async () => generateMessages(3))
                .verifiable(Times.once());

            const messages = await testSubject.getMessagesWithTotalCount(queue, 35);

            expect(messages).toHaveLength(35);
        });

        it('makes single call if count is within limits of single call', async () => {
            getMessagesMock
                .setup((s) => s(queue, 31))
                .returns(async () => generateMessages(31))
                .verifiable(Times.once());

            const messages = await testSubject.getMessagesWithTotalCount(queue, 31);

            expect(messages).toHaveLength(31);
        });

        it('returns empty array if no messages found', async () => {
            getMessagesMock
                .setup((s) => s(queue, 32))
                .returns(async () => [])
                .verifiable(Times.once());

            const messages = await testSubject.getMessagesWithTotalCount(queue, 100);

            expect(messages).toHaveLength(0);
        });
    });

    describe('getMessageCount', () => {
        it('getCountQueue', async () => {
            const count = 30;
            setupQueueGetCount(30);

            const actualCount = await testSubject.getMessageCount(queue);
            expect(actualCount).toBe(count);

            verifyAll();
        });
    });

    describe('createMessage', () => {
        it('creates message & queue message', async () => {
            const messageText = 'some message';

            setupRetryHelperMock();
            queueClientMock.setup(async (q) => q.createIfNotExists()).verifiable();
            setupVerifyCallToEnqueueMessage(queueClientMock, messageText, { messageId: 'id' });

            await testSubject.createMessage(queue, messageText);

            verifyAll();
        });

        it('creates message succeeded when queue exists', async () => {
            const messageText = 'some message';

            setupRetryHelperMock();
            queueClientMock.setup(async (q) => q.createIfNotExists()).verifiable();
            setupVerifyCallToEnqueueMessage(queueClientMock, messageText, { messageId: 'id' });

            const isCreated = await testSubject.createMessage(queue, messageText);
            expect(isCreated).toBe(true);

            verifyAll();
        });

        test.each([null, { messageId: null }])('creates message failed - response = %o', async (response) => {
            const messageText = 'some message';
            setupRetryHelperMock();
            queueClientMock.setup(async (q) => q.createIfNotExists()).verifiable();
            setupVerifyCallToEnqueueMessage(queueClientMock, messageText, response);
            loggerMock.setup((lm) => lm.logError(It.isAnyString())).verifiable();

            expect(await testSubject.createMessage(queue, messageText)).toEqual(false);

            verifyAll();
        });
    });

    describe('deleteMessage', () => {
        it('delete queue message by id', async () => {
            const message = {
                messageText: 'messageText-1',
                messageId: 'messageId-1',
                popReceipt: 'popReceipt-1',
            } as DequeuedMessageItem;

            setupVerifyCallToDeleteMessage(queueClientMock, message);
            await testSubject.deleteMessage(queue, message);

            verifyAll();
        });
    });

    function setupQueueGetCount(count: number): void {
        const getProperties = { approximateMessagesCount: count } as QueueGetPropertiesResponse;
        queueClientMock.setup(async (q) => q.getProperties()).returns(async () => Promise.resolve(getProperties));
    }

    function setupCreateQueuesIfNotExistsCall(): void {
        queueClientMock.setup(async (q) => q.createIfNotExists()).verifiable(Times.atLeastOnce());
        deadQueueClientMock.setup(async (q) => q.createIfNotExists()).verifiable(Times.atLeastOnce());
    }

    function setupVerifyCallToMoveMessageToDeadQueue(message: DequeuedMessageItem): void {
        setupVerifyCallToEnqueueMessage(deadQueueClientMock, message.messageText, { messageId: 1 });
        setupVerifyCallToDeleteMessage(queueClientMock, message);
    }

    function setupVerifyCallToEnqueueMessage(currentQueueClient: IMock<QueueClient>, messageText: string, response: any = null): void {
        currentQueueClient
            .setup(async (d) => d.sendMessage(JSON.stringify(messageText)))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());
    }

    function setupVerifyCallForDequeueMessage(queueMessageResults: DequeuedMessageItem[]): void {
        queueClientMock
            .setup(async (qc) => qc.receiveMessages({ numberOfMessages: 32, visibilityTimeout: messageVisibilityTimeout }))
            .returns(async () =>
                Promise.resolve({
                    receivedMessageItems: queueMessageResults,
                } as QueueReceiveMessageResponse),
            )
            .verifiable(Times.once());
    }
    function setupVerifyCallToDeleteMessage(currentQueueClient: IMock<QueueClient>, message: DequeuedMessageItem): void {
        currentQueueClient
            .setup(async (qc) => qc.deleteMessage(message.messageId, message.popReceipt))
            .returns(async () => null)
            .verifiable(Times.once());
    }

    function createMessagesFromServerMessages(serverMessages: DequeuedMessageItem[]): Message[] {
        return serverMessages.map((m) => {
            return new Message(m.messageText, m.messageId, m.popReceipt);
        });
    }

    function setupRetryHelperMock(): void {
        retryHelperMock
            .setup((r) => r.executeWithRetries(It.isAny(), It.isAny(), maxAttempts, 0))
            .returns(async (action: () => Promise<void>, errorHandler: (err: Error) => Promise<void>, _: number) => {
                await errorHandler(null);

                return action();
            })
            .verifiable();
    }

    function verifyAll(): void {
        queueServiceClientProviderMock.verifyAll();
        loggerMock.verifyAll();
        queueServiceClientMock.verifyAll();
        queueClientMock.verifyAll();
        deadQueueClientMock.verifyAll();
    }
});
