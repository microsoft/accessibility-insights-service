// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-any no-object-literal-type-assertion no-unsafe-any no-empty no-null-keyword
import 'reflect-metadata';

import { Aborter, MessageIdURL, MessagesURL, Models, QueueURL, ServiceURL } from '@azure/storage-queue';
import { ServiceConfiguration } from 'common';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { MessageIdURLProvider, MessagesURLProvider, QueueServiceURLProvider, QueueURLProvider } from '../ioc-types';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { Message } from './message';
import { Queue } from './queue';
import { StorageConfig } from './storage-config';

describe(Queue, () => {
    const messageVisibilityTimeout = 30;
    let config: StorageConfig;
    let testSubject: Queue;
    let queueServiceURLProviderMock: IMock<QueueServiceURLProvider>;
    let queueURLProviderMock: IMock<QueueURLProvider>;
    let messagesURLProviderMock: IMock<MessagesURLProvider>;
    let messageIdURLProviderMock: IMock<MessageIdURLProvider>;
    let loggerMock: IMock<MockableLogger>;
    let serviceURLMock: IMock<ServiceURL>;
    let queueURLMock: IMock<QueueURL>;
    let deadQueueURLMock: IMock<QueueURL>;
    let messagesURLMock: IMock<MessagesURL>;
    let deadMessagesURLMock: IMock<MessagesURL>;
    let messageIdUrlMock: IMock<MessageIdURL>;
    let serviceConfigMock: IMock<ServiceConfiguration>;

    beforeEach(() => {
        config = {
            scanQueue: 'queue-1',
        };
        queueServiceURLProviderMock = Mock.ofInstance((() => {}) as any);
        queueURLProviderMock = Mock.ofInstance((() => {}) as any);
        messagesURLProviderMock = Mock.ofInstance((() => {}) as any);
        messageIdURLProviderMock = Mock.ofInstance((() => {}) as any);

        serviceURLMock = Mock.ofType<ServiceURL>();
        queueURLMock = Mock.ofType<QueueURL>();
        deadQueueURLMock = Mock.ofType<QueueURL>();
        messagesURLMock = Mock.ofType<MessagesURL>();
        deadMessagesURLMock = Mock.ofType<MessagesURL>();
        messageIdUrlMock = Mock.ofType<MessageIdURL>();
        loggerMock = Mock.ofType(MockableLogger);
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async s => s.getConfigValue('queueConfig'))
            .returns(async () =>
                Promise.resolve({
                    maxQueueSize: 10,
                    messageVisibilityTimeoutInSeconds: messageVisibilityTimeout,
                }),
            );

        getPromisableDynamicMock(serviceURLMock);
        getPromisableDynamicMock(queueURLMock);
        getPromisableDynamicMock(deadQueueURLMock);
        getPromisableDynamicMock(messagesURLMock);
        getPromisableDynamicMock(deadMessagesURLMock);
        getPromisableDynamicMock(messageIdUrlMock);

        queueServiceURLProviderMock.setup(async q => q()).returns(async () => serviceURLMock.object);
        queueURLProviderMock.setup(q => q(serviceURLMock.object, config.scanQueue)).returns(() => queueURLMock.object);
        queueURLProviderMock.setup(q => q(serviceURLMock.object, `${config.scanQueue}-dead`)).returns(() => deadQueueURLMock.object);
        messagesURLProviderMock.setup(m => m(queueURLMock.object)).returns(() => messagesURLMock.object);
        messagesURLProviderMock.setup(m => m(deadQueueURLMock.object)).returns(() => deadMessagesURLMock.object);

        testSubject = new Queue(
            config,
            queueServiceURLProviderMock.object,
            queueURLProviderMock.object,
            messagesURLProviderMock.object,
            messageIdURLProviderMock.object,
            serviceConfigMock.object,
            loggerMock.object,
        );
    });

    describe('getMessages()', () => {
        it('get queue messages with low dequeue count', async () => {
            const toBeDequeuedMessage = {
                messageText: 'to be dequeued message text',
                messageId: 'to be dequeued message id',
                popReceipt: 'to be dequeued pop receipt',
                dequeueCount: 3,
            } as Models.DequeuedMessageItem;
            const notDequeuedMessage = {
                messageText: 'messageText-1',
                messageId: 'messageId-1',
                popReceipt: 'popReceipt-1',
                dequeueCount: 1,
            } as Models.DequeuedMessageItem;
            const queueMessageResults = [notDequeuedMessage, toBeDequeuedMessage];
            const actualQueueMessageResult = createMessagesFromServerMessages([notDequeuedMessage]);

            setupQueueCreationCallWhenQueueExists();

            setupVerifyCallToMoveMessageToDeadQueue(toBeDequeuedMessage);

            setupVerifyCallForDequeueMessage(queueMessageResults);

            const queueMessageResultActual = await testSubject.getMessages();

            expect(queueMessageResultActual).toEqual(actualQueueMessageResult);

            verifyAll();
        });

        it('creates queue when not exists', async () => {
            const message = {
                messageText: 'messageText-1',
                messageId: 'messageId-1',
                popReceipt: 'popReceipt-1',
                dequeueCount: 1,
            } as Models.DequeuedMessageItem;
            const queueMessageResults = [message];
            const actualQueueMessageResult = createMessagesFromServerMessages([message]);

            setupQueueCreationCallWhenQueueDoesNotExist();

            setupVerifyCallForDequeueMessage(queueMessageResults);

            const queueMessageResultActual = await testSubject.getMessages();

            expect(queueMessageResultActual).toEqual(actualQueueMessageResult);

            verifyAll();
        });
    });

    describe('getMessagesWithTotalCount', async () => {
        let getMessagesMock: IMock<(totalMessagesCount: number) => Promise<Message[]>>;
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
                .setup(s => s(32))
                .returns(async () => generateMessages(32))
                .verifiable(Times.once());

            getMessagesMock
                .setup(s => s(3))
                .returns(async () => generateMessages(3))
                .verifiable(Times.once());

            const messages = await testSubject.getMessagesWithTotalCount(35);

            expect(messages).toHaveLength(35);
        });

        it('makes single call if count is within limits of single call', async () => {
            getMessagesMock
                .setup(s => s(31))
                .returns(async () => generateMessages(31))
                .verifiable(Times.once());

            const messages = await testSubject.getMessagesWithTotalCount(31);

            expect(messages).toHaveLength(31);
        });
    });

    describe('createMessage', () => {
        it('creates message & queue', async () => {
            const messageText = 'some message';

            setupQueueCreationCallWhenQueueDoesNotExist();
            setupVerifyCallToEnqueueMessage(messagesURLMock, messageText);

            await testSubject.createMessage(config.scanQueue, messageText);

            verifyAll();
        });

        it('creates message when queue exists', async () => {
            const messageText = 'some message';

            setupQueueCreationCallWhenQueueExists();
            setupVerifyCallToEnqueueMessage(messagesURLMock, messageText);

            await testSubject.createMessage(config.scanQueue, messageText);

            verifyAll();
        });
    });

    describe('deleteMessage', () => {
        it('delete queue message by id', async () => {
            const message = {
                messageText: 'messageText-1',
                messageId: 'messageId-1',
                popReceipt: 'popReceipt-1',
            } as Models.DequeuedMessageItem;

            setupVerifyCallToDeleteMessage(message);
            await testSubject.deleteMessage(message);

            verifyAll();
        });
    });

    function setupQueueCreationCallWhenQueueExists(): void {
        queueURLMock.setup(async q => q.getProperties(Aborter.none)).returns(async () => Promise.resolve(null));
        deadQueueURLMock.setup(async q => q.getProperties(Aborter.none)).returns(async () => Promise.resolve(null));
    }

    function setupQueueCreationCallWhenQueueDoesNotExist(): void {
        queueURLMock.setup(async q => q.getProperties(Aborter.none)).returns(async () => Promise.reject(null));
        deadQueueURLMock.setup(async q => q.getProperties(Aborter.none)).returns(async () => Promise.reject(null));

        queueURLMock.setup(async q => q.create(Aborter.none)).returns(async () => Promise.resolve(null));
        deadQueueURLMock.setup(async q => q.create(Aborter.none)).returns(async () => Promise.resolve(null));
    }

    function setupVerifyCallToMoveMessageToDeadQueue(message: Models.DequeuedMessageItem): void {
        setupVerifyCallToEnqueueMessage(deadMessagesURLMock, message.messageText);
        setupVerifyCallToDeleteMessage(message);
    }

    function setupVerifyCallToEnqueueMessage(currentMessagesURLMock: IMock<MessagesURL>, messageText: string): void {
        currentMessagesURLMock
            .setup(async d => d.enqueue(Aborter.none, JSON.stringify(messageText)))
            .returns(async () => null)
            .verifiable(Times.once());
    }

    function setupVerifyCallForDequeueMessage(queueMessageResults: Models.DequeuedMessageItem[]): void {
        messagesURLMock
            .setup(async m => m.dequeue(Aborter.none, { numberOfMessages: 32, visibilitytimeout: messageVisibilityTimeout }))
            .returns(async () =>
                Promise.resolve({
                    dequeuedMessageItems: queueMessageResults,
                } as any),
            )
            .verifiable(Times.once());
    }
    function setupVerifyCallToDeleteMessage(message: Models.DequeuedMessageItem): void {
        messageIdURLProviderMock.setup(m => m(messagesURLMock.object, message.messageId)).returns(() => messageIdUrlMock.object);

        messageIdUrlMock
            .setup(async m => m.delete(Aborter.none, message.popReceipt))
            .returns(async => null)
            .verifiable(Times.once());
    }

    function createMessagesFromServerMessages(serverMessages: Models.DequeuedMessageItem[]): Message[] {
        return serverMessages.map(m => {
            return new Message(m.messageText, m.messageId, m.popReceipt);
        });
    }

    function verifyAll(): void {
        queueServiceURLProviderMock.verifyAll();
        queueURLProviderMock.verifyAll();
        messagesURLProviderMock.verifyAll();
        messageIdURLProviderMock.verifyAll();
        loggerMock.verifyAll();
        serviceURLMock.verifyAll();
        queueURLMock.verifyAll();
        deadQueueURLMock.verifyAll();
        messagesURLMock.verifyAll();
        deadMessagesURLMock.verifyAll();
        messageIdUrlMock.verifyAll();
    }
});
