import { QueueService } from 'azure-storage';
import { IMock, Mock, It } from 'typemoq';
import { StorageConfig } from './storage-config';
import { Queue } from './queue';

let config: StorageConfig;
let queue: Queue;
let queueServiceMock: IMock<QueueService>;

function beforeEachSuit(): void {
    config = {
        accountName: 'accountName',
        accountKey: 'accountKey',
        scanQueue: 'queue-1',
    };
    queueServiceMock = Mock.ofType();
}

describe('getMessages()', () => {
    beforeEach(() => beforeEachSuit());

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
        let callback: (error: Error) => void;
        let callback2: (error: Error, result: any) => void;
        queueServiceMock
            .setup(o => o.createQueueIfNotExists(It.isAny(), It.isAny()))
            .callback((q, c) => {
                callback = c;
            })
            .returns(() => callback(null));
        queueServiceMock
            .setup(o => o.createMessage(`${config.scanQueue}-dead`, It.isAny(), It.isAny()))
            .callback((q, m, c) => {
                callback = c;
            })
            .returns(() => callback(null))
            .verifiable();
        queueServiceMock
            .setup(o => o.deleteMessage(config.scanQueue, queueMessageResults[1].messageId, queueMessageResults[1].popReceipt, It.isAny()))
            .callback((q, m, r, c) => {
                callback = c;
            })
            .returns(() => {
                callback(null);
            });
        queueServiceMock
            .setup(o => o.getMessages(config.scanQueue, It.isAny(), It.isAny()))
            .callback((q, r, c) => {
                callback2 = c;
            })
            .returns(() => callback2(null, queueMessageResults))
            .verifiable();
        queue = new Queue(config, queueServiceMock.object);
        const queueMessageResultActual = await queue.getMessages();

        expect(queueMessageResultActual).toEqual(queueMessageResult);
        queueServiceMock.verifyAll();
    });
});

describe('deleteMessage()', () => {
    beforeEach(() => beforeEachSuit());

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
            .returns(() => callback(null))
            .verifiable();
        queueServiceMock
            .setup(o => o.deleteMessage(config.scanQueue, message.messageId, message.popReceipt, It.isAny()))
            .callback((q, m, r, c) => {
                callback = c;
            })
            .returns(() => callback(null))
            .verifiable();
        queue = new Queue(config, queueServiceMock.object);
        await queue.deleteMessage(message);

        queueServiceMock.verifyAll();
    });
});
