// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any no-unsafe-any
import 'reflect-metadata';

import { Logger } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { CosmosClientWrapper } from '../azure-cosmos/cosmos-client-wrapper';
import { CosmosDocument } from '../azure-cosmos/cosmos-document';
import { CosmosOperationResponse } from '../azure-cosmos/cosmos-operation-response';
import { StorageClient } from './storage-client';

type OperationCallback = (...args: any[]) => Promise<CosmosOperationResponse<any>>;

const dbName = 'dbName';
const collectionName = 'collectionName';
const partitionKey = 'default-partitionKey';

let cosmosClientWrapperMock: IMock<CosmosClientWrapper>;
let storageClient: StorageClient;
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
    storageClient = new StorageClient(cosmosClientWrapperMock.object, dbName, collectionName, loggerMock.object);
});

describe('StorageClient.mergeDocument()', () => {
    it('validate document id value', async () => {
        const item = {
            value: 'value',
        };

        const op = storageClient.mergeDocument(item as CosmosDocument, partitionKey);

        await expect(op).rejects.toEqual(
            'Document id property is undefined. Storage document merge operation must have a valid document id property value.',
        );
    });

    it('validate existence of a storage document', async () => {
        const item = {
            id: '123',
            value: 'value',
        };

        cosmosClientWrapperMock
            .setup(async o => o.readItem(item.id, dbName, collectionName, partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 404 }))
            .verifiable(Times.once());

        const op = storageClient.mergeDocument(item, partitionKey);

        await expect(op).rejects.toEqual(`Storage document with id ${item.id} not found. Unable to perform merge operation.`);
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
        const response = await storageClient.mergeDocument(item);
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
        const response = await storageClient.mergeDocument(item, partitionKey);
        expect(response.item).toEqual({ storageItem: true });

        cosmosClientWrapperMock.verifyAll();
    });

    it('merge with a storage document', async () => {
        const mergeItem = {
            id: '123',
            valueA: 'new-value',
            valueB: <string>undefined,
            valueC: 'new-property',
            valueD: [1, 2],
        };

        const storageItem = {
            id: '123',
            valueA: 'old-value',
            valueB: 'current-value',
            valueD: [3, 4],
        };

        let resultItem = {};
        cosmosClientWrapperMock
            .setup(async o => o.readItem(mergeItem.id, dbName, collectionName, partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 201, item: storageItem }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async o => o.upsertItem(It.isAny(), dbName, collectionName, partitionKey))
            .callback(async (i, d, c, p) => {
                resultItem = i;
            })
            .returns(async () => Promise.resolve({ statusCode: 202, item: resultItem }))
            .verifiable(Times.once());

        const response = await storageClient.mergeDocument(mergeItem, partitionKey);

        const expectedItem = {
            id: storageItem.id,
            valueA: mergeItem.valueA,
            valueB: storageItem.valueB,
            valueC: mergeItem.valueC,
            valueD: mergeItem.valueD,
        };
        expect(response.item).toEqual(expectedItem);
        cosmosClientWrapperMock.verifyAll();
    });
});

describe('StorageClient.tryExecuteOperation()', () => {
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

        const resultPromise = storageClient.tryExecuteOperation(operationCallbackMock.object, retryOptions, 'arg1', 'arg2');

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

        const result = await storageClient.tryExecuteOperation(operationCallbackMock.object, retryOptions, 'arg1', 'arg2');

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

        const result = await storageClient.tryExecuteOperation(operationCallbackMock.object, retryOptions, 'arg1', 'arg2');

        expect(result).toEqual(expectedResult);
        operationCallbackMock.verifyAll();
    });
});

describe('StorageClient', () => {
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

        await storageClient.writeDocuments(items, partitionKey);

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

        const result = await storageClient.writeDocument(item);

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

        const result = await storageClient.writeDocument(item, partitionKey);

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

        const result = await storageClient.readDocument('id', partitionKey);

        expect(result).toEqual(expectedResult);
        cosmosClientWrapperMock.verifyAll();
    });
});
