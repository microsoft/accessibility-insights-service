// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any no-unsafe-any
import 'reflect-metadata';

import { Logger } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { CosmosClientWrapper } from '../azure-cosmos/cosmos-client-wrapper';
import { CosmosDocument } from '../azure-cosmos/cosmos-document';
import { CosmosOperationResponse } from '../azure-cosmos/cosmos-operation-response';
import { CosmosContainerClient } from './storage-client';

type OperationCallback = (...args: any[]) => Promise<CosmosOperationResponse<any>>;

const dbName = 'dbName';
const collectionName = 'collectionName';
const partitionKey = 'default-partitionKey';

let cosmosClientWrapperMock: IMock<CosmosClientWrapper>;
let cosmosContainerClient: CosmosContainerClient;
let operationCallbackMock: IMock<OperationCallback>;
let loggerMock: IMock<Logger>;

const retryOptions = {
    timeoutMilliseconds: 1000,
    intervalMilliseconds: 200,
    retryingOnStatusCodes: [412 /* PreconditionFailed */],
};

beforeEach(() => {
    cosmosClientWrapperMock = Mock.ofType<CosmosClientWrapper>();
    operationCallbackMock = Mock.ofType<OperationCallback>();
    loggerMock = Mock.ofType(Logger);
    cosmosContainerClient = new CosmosContainerClient(cosmosClientWrapperMock.object, dbName, collectionName, loggerMock.object);
});

describe('mergeOrWriteDocument()', () => {
    it('validate document id value', async () => {
        const item = {
            value: 'value',
        };

        const op = cosmosContainerClient.mergeOrWriteDocument(item as CosmosDocument, partitionKey);

        await expect(op).rejects.toEqual(
            'Document id property is undefined. Storage document merge operation must have a valid document id property value.',
        );
    });

    it('insert a storage document', async () => {
        const item = {
            id: '123',
            partitionKey: 'item-partitionKey',
            value: 'value',
        };

        cosmosClientWrapperMock
            .setup(async o => o.readItem(item.id, dbName, collectionName, item.partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 404 }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async o => o.upsertItem(item, dbName, collectionName, item.partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 202, item: item }))
            .verifiable(Times.once());

        const response = await cosmosContainerClient.mergeOrWriteDocument(item);

        expect(response.item).toEqual(item);
        cosmosClientWrapperMock.verifyAll();
    });

    it('use item partition key', async () => {
        const item = {
            id: '123',
            partitionKey: 'item-partitionKey',
            value: 'value',
        };

        cosmosClientWrapperMock
            .setup(async o => o.readItem(item.id, dbName, collectionName, item.partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 200 }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async o => o.upsertItem(It.isAny(), dbName, collectionName, item.partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 202, item: { storageItem: true } }))
            .verifiable(Times.once());
        const response = await cosmosContainerClient.mergeOrWriteDocument(item);

        expect(response.item).toEqual({ storageItem: true });
        cosmosClientWrapperMock.verifyAll();
    });

    it('use default partition key', async () => {
        const item = {
            id: '123',
            partitionKey: 'item-partitionKey',
            value: 'value',
        };

        cosmosClientWrapperMock
            .setup(async o => o.readItem(item.id, dbName, collectionName, partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 200 }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async o => o.upsertItem(It.isAny(), dbName, collectionName, partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 202, item: { storageItem: true } }))
            .verifiable(Times.once());
        const response = await cosmosContainerClient.mergeOrWriteDocument(item, partitionKey);
        expect(response.item).toEqual({ storageItem: true });

        cosmosClientWrapperMock.verifyAll();
    });

    it('merge with a storage document', async () => {
        const documentItem = {
            id: 'id',
            valueA: 'document-valueA',
            valueB: <string>undefined,
            valueC: 'document-valueC',
            valueD: ['document-valueD-item1'],
            _etag: 'document-etag',
        };

        const storageItem = {
            id: 'id',
            valueA: 'storage-valueA',
            valueB: 'storage-valueB',
            valueD: ['storage-valueD-item3', 'storage-valueD-item4'],
            _etag: 'storage-etag',
        };

        const expectedItem = {
            id: 'id',
            valueA: 'document-valueA',
            valueB: 'storage-valueB',
            valueC: 'document-valueC',
            valueD: ['document-valueD-item1', 'storage-valueD-item4'],
            _etag: 'storage-etag',
        };

        let mergedItem = {};
        cosmosClientWrapperMock
            .setup(async o => o.readItem(documentItem.id, dbName, collectionName, partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 200, item: storageItem }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async o => o.upsertItem(It.isAny(), dbName, collectionName, partitionKey))
            .callback(async (i, d, c, p) => {
                mergedItem = i;
            })
            .returns(async () => Promise.resolve({ statusCode: 200, item: mergedItem }))
            .verifiable(Times.once());

        const response = await cosmosContainerClient.mergeOrWriteDocument(documentItem, partitionKey);

        expect(response.item).toEqual(expectedItem);
        cosmosClientWrapperMock.verifyAll();
    });
});

describe('CosmosContainerClient.tryExecuteOperation()', () => {
    it('invoke operation callback with timeout', async () => {
        const item = {
            value: 'value',
        };
        const expectedResult = {
            item: item,
            statusCode: 500,
        };
        operationCallbackMock
            .setup(async o => o('arg1', 'arg2'))
            .returns(async () =>
                Promise.resolve({
                    statusCode: 500,
                    item: item,
                }),
            )
            .verifiable(Times.atLeast(5));

        const resultPromise = cosmosContainerClient.tryExecuteOperation(operationCallbackMock.object, retryOptions, 'arg1', 'arg2');

        await expect(resultPromise).rejects.toEqual(expectedResult);
        operationCallbackMock.verifyAll();
    });

    it('invoke operation callback with retry', async () => {
        const item = {
            value: 'value',
        };
        const expectedResult = {
            item: item,
            statusCode: 200,
        };

        let retryCount = 0;
        let statusCode = 200;
        operationCallbackMock
            .setup(async o => o('arg1', 'arg2'))
            .callback((...args: any[]) => {
                if (retryCount === 0) {
                    statusCode = 412;
                } else if (retryCount === 1) {
                    statusCode = 500;
                } else {
                    statusCode = 200;
                }
                retryCount = retryCount + 1;
            })
            .returns(async () =>
                Promise.resolve({
                    statusCode: statusCode,
                    item: item,
                }),
            )
            .verifiable(Times.exactly(3));

        const result = await cosmosContainerClient.tryExecuteOperation(operationCallbackMock.object, retryOptions, 'arg1', 'arg2');

        expect(result).toEqual(expectedResult);
        operationCallbackMock.verifyAll();
    });

    it('invoke operation callback', async () => {
        const item = {
            value: 'value',
        };
        const expectedResult = {
            item: item,
            statusCode: 200,
        };
        operationCallbackMock
            .setup(async o => o('arg1', 'arg2'))
            .returns(async () => Promise.resolve({ statusCode: 200, item: item }))
            .verifiable(Times.once());

        const result = await cosmosContainerClient.tryExecuteOperation(operationCallbackMock.object, retryOptions, 'arg1', 'arg2');

        expect(result).toEqual(expectedResult);
        operationCallbackMock.verifyAll();
    });
});

describe('CosmosContainerClient', () => {
    it('writeDocuments()', async () => {
        const items = [
            {
                value: 'value1',
            },
            {
                value: 'value2',
            },
        ];
        cosmosClientWrapperMock
            .setup(async o => o.upsertItems(items, dbName, collectionName, partitionKey))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());

        await cosmosContainerClient.writeDocuments(items, partitionKey);

        cosmosClientWrapperMock.verifyAll();
    });

    it('writeDocument() using document partition key', async () => {
        const item = {
            id: 'id',
            partitionKey: 'item-partitionKey',
            value: 'value',
        };
        const expectedResult = {
            item: item,
            statusCode: 200,
        };
        cosmosClientWrapperMock
            .setup(async o => o.upsertItem(item, dbName, collectionName, item.partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 200, item: item }))
            .verifiable(Times.once());

        const result = await cosmosContainerClient.writeDocument(item);

        expect(result).toEqual(expectedResult);
        cosmosClientWrapperMock.verifyAll();
    });

    it('writeDocument() using default partition key', async () => {
        const item = {
            id: 'id',
            partitionKey: 'item-partitionKey',
            value: 'value',
        };
        const expectedResult = {
            item: item,
            statusCode: 200,
        };
        cosmosClientWrapperMock
            .setup(async o => o.upsertItem(item, dbName, collectionName, partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 200, item: item }))
            .verifiable(Times.once());

        const result = await cosmosContainerClient.writeDocument(item, partitionKey);

        expect(result).toEqual(expectedResult);
        cosmosClientWrapperMock.verifyAll();
    });

    it('readDocument()', async () => {
        const item = {
            value: 'value',
        };
        const expectedResult = {
            item: item,
            statusCode: 200,
        };
        cosmosClientWrapperMock
            .setup(async o => o.readItem('id', dbName, collectionName, partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 200, item: item }))
            .verifiable(Times.once());

        const result = await cosmosContainerClient.readDocument('id', partitionKey);

        expect(result).toEqual(expectedResult);
        cosmosClientWrapperMock.verifyAll();
    });

    it('mergeDocuments() using document partition key', async () => {
        const items = [
            {
                id: 'id1',
                partitionKey: 'item-partitionKey',
                value: 'value1',
            },
            {
                id: 'id2',
                partitionKey: 'item-partitionKey',
                value: 'value2',
            },
        ];
        cosmosClientWrapperMock
            .setup(async o => o.readItem(items[0].id, dbName, collectionName, items[0].partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 201, item: items[0] }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async o => o.readItem(items[1].id, dbName, collectionName, items[1].partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 201, item: items[1] }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async o => o.upsertItem(items[0], dbName, collectionName, items[0].partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 200, item: items[0] }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async o => o.upsertItem(items[1], dbName, collectionName, items[1].partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 200, item: items[1] }))
            .verifiable(Times.once());

        await cosmosContainerClient.mergeOrWriteDocuments(items);

        cosmosClientWrapperMock.verifyAll();
    });
});
