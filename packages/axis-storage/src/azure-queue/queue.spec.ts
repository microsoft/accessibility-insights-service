// tslint:disable: no-any no-object-literal-type-assertion no-unsafe-any
import 'reflect-metadata';

import { QueueService } from 'azure-storage';
import { Logger } from 'logger';
import { IMock, It, Mock } from 'typemoq';
import { AzureQueueServiceProvider } from '../ioc-types';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { Queue } from './queue';
import { StorageConfig } from './storage-config';

describe(Queue, () => {
    let config: StorageConfig;
    let queue: Queue;
    let queueServiceMock: IMock<QueueService>;
    let queueServiceProviderStub: AzureQueueServiceProvider;
    let loggerMock: IMock<Logger>;

    beforeEach(() => {
        config = {
            scanQueue: 'queue-1',
        };
        queueServiceMock = Mock.ofType();

        getPromisableDynamicMock(queueServiceMock);
        queueServiceProviderStub = async () => queueServiceMock.object;

        loggerMock = Mock.ofType(Logger);
    });

    describe('getMessages()', () => {
        it('get queue messages with low dequeue count', async () => {
            const queueMessageResults = [
                <QueueService.QueueMessageResult>{
                    messageText: 'messageText-1',
                    messageId: 'messageId-1',
                    popReceipt: 'popReceipt-1',
                    dequeueCount: 1,
                },
                <QueueService.QueueMessageResult>{
                    messageText: 'messageText-2',
                    messageId: 'messageId-2',
                    popReceipt: 'popReceipt-2',
                    dequeueCount: 3,
                },
            ];
            const queueMessageResult = [
                {
                    messageText: 'messageText-1',
                    messageId: 'messageId-1',
                    popReceipt: 'popReceipt-1',
                },
            ];

            queueServiceMock
                .setup(o => o.createQueueIfNotExists(It.isAny(), It.isAny()))
                .returns((q, c) => {
                    return c(undefined);
                });

            queueServiceMock
                .setup(o => o.createMessage(`${config.scanQueue}-dead`, It.isAny(), It.isAny()))
                .returns((q, m, c) => {
                    return c(undefined);
                })
                .verifiable();

            queueServiceMock
                .setup(o =>
                    o.deleteMessage(config.scanQueue, queueMessageResults[1].messageId, queueMessageResults[1].popReceipt, It.isAny()),
                )
                .returns((q, m, r, c) => {
                    return c(undefined);
                })
                .verifiable();

            queueServiceMock
                .setup(o => o.getMessages(config.scanQueue, It.isAny(), It.isAny()))
                .returns((q, r, c) => {
                    return c(undefined, queueMessageResults);
                })
                .verifiable();

            queue = new Queue(config, queueServiceProviderStub, loggerMock.object);
            const queueMessageResultActual = await queue.getMessages();

            expect(queueMessageResultActual).toEqual(queueMessageResult);

            queueServiceMock.verifyAll();
        });
    });

    describe('deleteMessage()', () => {
        it('delete queue message by id', async () => {
            const message = {
                messageText: 'messageText-1',
                messageId: 'messageId-1',
                popReceipt: 'popReceipt-1',
            };
            let callback: (error: Error) => void;
            queueServiceMock
                .setup(o => o.createQueueIfNotExists(config.scanQueue, It.isAny()))
                .callback((q, c) => {
                    callback = c;
                })
                .returns(() => callback(undefined))
                .verifiable();
            queueServiceMock
                .setup(o => o.deleteMessage(config.scanQueue, message.messageId, message.popReceipt, It.isAny()))
                .callback((q, m, r, c) => {
                    callback = c;
                })
                .returns(() => callback(undefined))
                .verifiable();
            queue = new Queue(config, queueServiceProviderStub, loggerMock.object);
            await queue.deleteMessage(message);

            queueServiceMock.verifyAll();
        });
    });
});
