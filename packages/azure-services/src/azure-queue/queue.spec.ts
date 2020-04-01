// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-any no-object-literal-type-assertion no-unsafe-any no-empty no-null-keyword
import 'reflect-metadata';

import { Aborter, MessageIdURL, MessagesURL, Models, QueueURL, ServiceURL } from '@azure/storage-queue';
import { RetryHelper, ServiceConfiguration } from 'common';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { MessageIdURLProvider, MessagesURLProvider, QueueServiceURLProvider, QueueURLProvider } from '../ioc-types';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { Message } from './message';
import { Queue } from './queue';

describe(Queue, () => {
    const messageVisibilityTimeout = 30;
    let queue: string;
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
    let retryHelperMock: IMock<RetryHelper<void>>;
    const maxAttempts = 3;

    beforeEach(() => {
        queue = 'queue-1';
        queueServiceURLProviderMock = Mock.ofInstance((() => {}) as any);
        queueURLProviderMock = Mock.ofInstance((() => {}) as any);
        messagesURLProviderMock = Mock.ofInstance((() => {}) as any);
        messageIdURLProviderMock = Mock.ofInstance((() => {}) as any);
        retryHelperMock = Mock.ofType<RetryHelper<void>>();

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
        queueURLProviderMock.setup(q => q(serviceURLMock.object, queue)).returns(() => queueURLMock.object);
        queueURLProviderMock.setup(q => q(serviceURLMock.object, `${queue}-dead`)).returns(() => deadQueueURLMock.object);
        messagesURLProviderMock.setup(m => m(queueURLMock.object)).returns(() => messagesURLMock.object);
        messagesURLProviderMock.setup(m => m(deadQueueURLMock.object)).returns(() => deadMessagesURLMock.object);

        testSubject = new Queue(
            queueServiceURLProviderMock.object,
            queueURLProviderMock.object,
            messagesURLProviderMock.object,
            messageIdURLProviderMock.object,
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
            } as Models.DequeuedMessageItem;
            const queueMessageResults = [message];
            const actualQueueMessageResult = createMessagesFromServerMessages([message]);

            setupQueueCreationCallWhenQueueDoesNotExist();

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
                .setup(s => s(queue, 32))
                .returns(async () => generateMessages(32))
                .verifiable(Times.once());

            getMessagesMock
                .setup(s => s(queue, 3))
                .returns(async () => generateMessages(3))
                .verifiable(Times.once());

            const messages = await testSubject.getMessagesWithTotalCount(queue, 35);

            expect(messages).toHaveLength(35);
        });

        it('makes single call if count is within limits of single call', async () => {
            getMessagesMock
                .setup(s => s(queue, 31))
                .returns(async () => generateMessages(31))
                .verifiable(Times.once());

            const messages = await testSubject.getMessagesWithTotalCount(queue, 31);

            expect(messages).toHaveLength(31);
        });

        it('returns empty array if no messages found', async () => {
            getMessagesMock
                .setup(s => s(queue, 32))
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
        it('creates message & queue', async () => {
            const messageText = 'some message';

            setupRetryHelperMock();
            setupQueueCreationCallWhenQueueDoesNotExist();
            setupVerifyCallToEnqueueMessage(messagesURLMock, messageText, { messageId: 'id' });

            await testSubject.createMessage(queue, messageText);

            verifyAll();
        });

        it('creates message succeeded when queue exists', async () => {
            const messageText = 'some message';

            setupRetryHelperMock();
            setupQueueCreationCallWhenQueueExists();
            setupVerifyCallToEnqueueMessage(messagesURLMock, messageText, { messageId: 'id' });

            const isCreated = await testSubject.createMessage(queue, messageText);
            expect(isCreated).toBe(true);

            verifyAll();
        });

        test.each([null, { messageId: null }])('creates message failed - response = %o', async response => {
            const messageText = 'some message';
            setupRetryHelperMock();
            setupQueueCreationCallWhenQueueExists();
            setupVerifyCallToEnqueueMessage(messagesURLMock, messageText, response);
            loggerMock.setup(lm => lm.logError(It.isAnyString())).verifiable();

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
            } as Models.DequeuedMessageItem;

            setupVerifyCallToDeleteMessage(message);
            await testSubject.deleteMessage(queue, message);

            verifyAll();
        });
    });

    function setupQueueGetCount(count: number): void {
        const getProperties = { approximateMessagesCount: count } as Models.QueueGetPropertiesResponse;
        queueURLMock.setup(async q => q.getProperties(Aborter.none)).returns(async () => Promise.resolve(getProperties));
    }

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
        setupVerifyCallToEnqueueMessage(deadMessagesURLMock, message.messageText, { messageId: 1 });
        setupVerifyCallToDeleteMessage(message);
    }

    function setupVerifyCallToEnqueueMessage(currentMessagesURLMock: IMock<MessagesURL>, messageText: string, response: any = null): void {
        currentMessagesURLMock
            .setup(async d => d.enqueue(Aborter.none, JSON.stringify(messageText)))
            .returns(async () => Promise.resolve(response))
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

    function setupRetryHelperMock(): void {
        retryHelperMock
            .setup(r => r.executeWithRetries(It.isAny(), It.isAny(), maxAttempts, 0))
            .returns(async (action: () => Promise<void>, errorHandler: (err: Error) => Promise<void>, _: number) => {
                await errorHandler(null);

                return action();
            })
            .verifiable();
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
