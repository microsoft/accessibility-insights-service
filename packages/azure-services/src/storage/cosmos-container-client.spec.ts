// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as MockDate from 'mockdate';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { PatchRequestBody } from '@azure/cosmos';
import { CosmosClientWrapper } from '../azure-cosmos/cosmos-client-wrapper';
import { CosmosDocument } from '../azure-cosmos/cosmos-document';
import { CosmosOperationResponse } from '../azure-cosmos/cosmos-operation-response';
import { CosmosContainerClient } from './cosmos-container-client';

/* eslint-disable import/no-unassigned-import, @typescript-eslint/no-explicit-any */

const dbName = 'dbName';
const collectionName = 'collectionName';
const partitionKey = 'default-partitionKey';

let cosmosClientWrapperMock: IMock<CosmosClientWrapper>;
let cosmosContainerClient: CosmosContainerClient;

beforeEach(() => {
    cosmosClientWrapperMock = Mock.ofType<CosmosClientWrapper>();
    cosmosContainerClient = new CosmosContainerClient(cosmosClientWrapperMock.object, dbName, collectionName);
});

afterEach(() => {
    MockDate.reset();
});

describe('createDocumentIfNotExist()', () => {
    it('create document if does not exist', async () => {
        const item = {
            id: '123',
            partitionKey: 'item-partitionKey',
            value: 'value',
        };

        cosmosClientWrapperMock
            .setup(async (o) => o.createItem(item, dbName, collectionName, item.partitionKey, false))
            .returns(async () => Promise.resolve({ statusCode: 202, item }))
            .verifiable(Times.once());

        const response = await cosmosContainerClient.createDocumentIfNotExist(item);

        expect(response.item).toEqual(item);
        cosmosClientWrapperMock.verifyAll();
    });

    it('read document if exists', async () => {
        const item = {
            id: '123',
            partitionKey: 'item-partitionKey',
            value: 'value',
        };

        cosmosClientWrapperMock
            .setup(async (o) => o.createItem(item, dbName, collectionName, item.partitionKey, false))
            .returns(async () => Promise.resolve({ statusCode: 409 }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async (o) => o.readItem(item.id, dbName, collectionName, item.partitionKey, true))
            .returns(async () => Promise.resolve({ statusCode: 200, item }))
            .verifiable(Times.once());

        const response = await cosmosContainerClient.createDocumentIfNotExist(item);

        expect(response.item).toEqual(item);
        cosmosClientWrapperMock.verifyAll();
    });
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
            .setup(async (o) => o.readItem(item.id, dbName, collectionName, item.partitionKey, false))
            .returns(async () => Promise.resolve({ statusCode: 404 }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async (o) => o.upsertItem(item, dbName, collectionName, item.partitionKey, true))
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
            .setup(async (o) => o.readItem(item.id, dbName, collectionName, item.partitionKey, false))
            .returns(async () => Promise.resolve({ statusCode: 200 }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async (o) => o.upsertItem(It.isAny(), dbName, collectionName, item.partitionKey, true))
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
            .setup(async (o) => o.readItem(item.id, dbName, collectionName, partitionKey, false))
            .returns(async () => Promise.resolve({ statusCode: 200 }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async (o) => o.upsertItem(It.isAny(), dbName, collectionName, partitionKey, true))
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
            valueD: ['document-valueD-item1', 'storage-valueD-item4'],
            valueE: <string>null,
            valueH: {
                id: 'id-1',
                prop: <string>null,
            },
            _etag: 'document-etag',
        };

        const storageItem = {
            id: 'id',
            valueA: 'storage-valueA',
            valueB: 'storage-valueB',
            valueD: ['storage-valueD-item3', 'storage-valueD-item4'],
            valueE: 'storage-valueE',
            valueH: {
                id: 'id-1',
                prop: 'prop-1',
            },
            _etag: 'storage-etag',
        };

        const expectedMergedItem = {
            id: 'id',
            valueA: 'document-valueA', // replaced from a source
            valueB: 'storage-valueB', // keep a target value when the source property is undefined
            valueC: 'document-valueC', // assigned from a source to new property
            valueD: ['document-valueD-item1', 'storage-valueD-item4'], // position based array merge
            valueE: <string>undefined, // reset a target to undefined when the source property is null
            valueH: {
                id: 'id-1',
                prop: <string>undefined, // reset a child object's target property to undefined when the source property is null
            },
            _etag: 'storage-etag', // keep target value based on a property name
        };

        let mergedItem = {};
        cosmosClientWrapperMock
            .setup(async (o) => o.readItem(documentItem.id, dbName, collectionName, partitionKey, false))
            .returns(async () => Promise.resolve({ statusCode: 200, item: storageItem }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async (o) => o.upsertItem(It.isAny(), dbName, collectionName, partitionKey, true))
            .callback(async (i, d, c, p) => {
                mergedItem = i;
            })
            .returns(async () => Promise.resolve({ statusCode: 200, item: mergedItem }))
            .verifiable(Times.once());

        const response = await cosmosContainerClient.mergeOrWriteDocument(documentItem, partitionKey);

        expect(response.item).toEqual(expectedMergedItem);
        cosmosClientWrapperMock.verifyAll();
    });
});

describe('Cosmos container client generic operations', () => {
    it('patchDocument()', async () => {
        const id = 'id';
        const operations = [{ op: 'add', path: 'path' }] as PatchRequestBody;
        const expectedResult = { statusCode: 200, item: {} };
        cosmosClientWrapperMock
            .setup(async (o) => o.patchItem(id, operations, dbName, collectionName, partitionKey, true))
            .returns(async () => Promise.resolve(expectedResult))
            .verifiable();

        const actualResult = await cosmosContainerClient.patchDocument(id, operations, partitionKey);
        expect(actualResult).toEqual(expectedResult);
    });

    it('writeDocuments()', async () => {
        const items = [
            {
                id: 'id1',
                value: 'value1',
            },
            {
                id: 'id2',
                value: 'value2',
            },
        ];
        cosmosClientWrapperMock
            .setup(async (o) => o.upsertItem(It.isAny(), dbName, collectionName, partitionKey))
            .verifiable(Times.exactly(2));

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
            .setup(async (o) => o.upsertItem(item, dbName, collectionName, item.partitionKey, true))
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
            .setup(async (o) => o.upsertItem(item, dbName, collectionName, partitionKey, true))
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
            .setup(async (o) => o.readItem('id', dbName, collectionName, partitionKey, true))
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
            .setup(async (o) => o.readItem(items[0].id, dbName, collectionName, items[0].partitionKey, false))
            .returns(async () => Promise.resolve({ statusCode: 201, item: items[0] }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async (o) => o.readItem(items[1].id, dbName, collectionName, items[1].partitionKey, false))
            .returns(async () => Promise.resolve({ statusCode: 201, item: items[1] }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async (o) => o.upsertItem(items[0], dbName, collectionName, items[0].partitionKey, true))
            .returns(async () => Promise.resolve({ statusCode: 200, item: items[0] }))
            .verifiable(Times.once());
        cosmosClientWrapperMock
            .setup(async (o) => o.upsertItem(items[1], dbName, collectionName, items[1].partitionKey, true))
            .returns(async () => Promise.resolve({ statusCode: 200, item: items[1] }))
            .verifiable(Times.once());

        await cosmosContainerClient.mergeOrWriteDocuments(items);

        cosmosClientWrapperMock.verifyAll();
    });
});

describe('executeQueryWithContinuationToken', () => {
    it('runs till end of page', async () => {
        const executeMock: IMock<(token: string) => Promise<CosmosOperationResponse<string[]>>> = Mock.ofInstance(
            (() => {
                return 0;
            }) as any,
            MockBehavior.Strict,
        );
        const response1: CosmosOperationResponse<string[]> = {
            continuationToken: 'token1',
            statusCode: 200,
            item: ['val1'],
        };

        const response2: CosmosOperationResponse<string[]> = {
            continuationToken: 'token2',
            statusCode: 200,
            item: ['val2'],
        };
        const response3: CosmosOperationResponse<string[]> = {
            statusCode: 200,
            item: ['val3', 'val4'],
        };

        executeMock.setup(async (e) => e(undefined)).returns(async () => Promise.resolve(response1));
        executeMock.setup(async (e) => e('token1')).returns(async () => Promise.resolve(response2));
        executeMock.setup(async (e) => e('token2')).returns(async () => Promise.resolve(response3));

        const result = await cosmosContainerClient.executeQueryWithContinuationToken(executeMock.object);

        expect(result).toEqual(['val1', 'val2', 'val3', 'val4']);
        executeMock.verifyAll();
    });

    it('fails on error response', async () => {
        const executeMock: IMock<(token: string) => Promise<CosmosOperationResponse<string[]>>> = Mock.ofInstance(
            (() => {
                return 0;
            }) as any,
            MockBehavior.Strict,
        );
        const response1: CosmosOperationResponse<string[]> = {
            continuationToken: 'token2',
            statusCode: 401,
        };

        executeMock.setup(async (e) => e(undefined)).returns(async () => Promise.resolve(response1));

        await expect(cosmosContainerClient.executeQueryWithContinuationToken(executeMock.object)).rejects.toThrowError(
            /The request has failed/,
        );
        executeMock.verifyAll();
    });
});
