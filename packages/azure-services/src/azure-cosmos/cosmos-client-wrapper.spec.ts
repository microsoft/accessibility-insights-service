// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any no-unsafe-any
import 'reflect-metadata';

import * as cosmos from '@azure/cosmos';
import { IMock, It, Mock } from 'typemoq';
import { CosmosClientProvider } from '../ioc-types';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { CosmosClientWrapper } from './cosmos-client-wrapper';
import { CosmosDocument } from './cosmos-document';

describe('CosmosClientWrapper', () => {
    let testSubject: CosmosClientWrapper;
    let cosmosClientProviderStub: CosmosClientProvider;
    let cosmosClientMock: IMock<cosmos.CosmosClient>;
    let dbMock: IMock<cosmos.Database>;
    let collectionMock: IMock<cosmos.Container>;
    let itemsMock: IMock<cosmos.Items>;
    let itemMock: IMock<cosmos.Item>;
    let queryIteratorMock: IMock<cosmos.QueryIterator<any>>;
    let loggerMock: IMock<MockableLogger>;
    const partitionKey = 'partitionKey';
    const dbName = 'stub db';
    const collectionName = 'stub collection';
    const errorResponse = { code: 500, body: 'Unable to store the item.' };

    beforeEach(() => {
        setupCosmosMocks();
        setupVerifiableGetDbCall();
        setupVerifiableGetCollectionCall();
        loggerMock = Mock.ofType(MockableLogger);
        testSubject = new CosmosClientWrapper(cosmosClientProviderStub, loggerMock.object);
    });

    describe('readAllItem()', () => {
        it('handles error response', async () => {
            const expectedResult = {
                response: 'NotFound',
                statusCode: 404,
            };
            const responseError: cosmos.ErrorResponse = {
                message: 'NotFound',
                name: 'NotFound',
                code: 404,
            };
            collectionMock.setup((c) => c.items).returns(() => itemsMock.object);
            itemsMock.setup((i) => i.readAll()).returns(() => queryIteratorMock.object);
            queryIteratorMock.setup(async (qm) => qm.fetchAll()).returns(async () => Promise.reject(responseError));

            const result = await testSubject.readAllItem(dbName, collectionName, false);
            expect(result).toEqual(expectedResult);
            itemsMock.verifyAll();
            queryIteratorMock.verifyAll();
            verifyMocks();

            await expect(testSubject.readAllItem(dbName, collectionName)).rejects.toThrowError(
                `The Cosmos DB 'readAllItems' operation failed. Response status code: 404 Response: NotFound`,
            );
        });

        it('read all items', async () => {
            const items = [
                {
                    id: 'id-1',
                    propA: 'propA',
                    _etag: 'etag-1',
                    _ts: 123456789,
                },
                {
                    id: 'id-2',
                    propA: 'propA',
                    _etag: 'etag-1',
                    _ts: 123456789,
                },
            ];
            const response: cosmos.FeedResponse<cosmos.ItemDefinition> = {
                resources: items,
            } as any;
            collectionMock.setup((c) => c.items).returns(() => itemsMock.object);
            itemsMock.setup((i) => i.readAll()).returns(() => queryIteratorMock.object);
            queryIteratorMock.setup(async (qm) => qm.fetchAll()).returns(async () => Promise.resolve(response));

            const result = await testSubject.readAllItem(dbName, collectionName);
            expect(result.item).toEqual(items);
            itemsMock.verifyAll();
            queryIteratorMock.verifyAll();
            verifyMocks();
        });
    });

    describe('readItem()', () => {
        it('read item with failed response ', async () => {
            const expectedResult = {
                response: 'NotFound',
                statusCode: 404,
            };
            const responseError: cosmos.ErrorResponse = {
                message: 'NotFound',
                name: 'NotFound',
                code: 404,
            };
            collectionMock.setup((c) => c.item('id', partitionKey)).returns(() => itemMock.object);
            itemMock.setup(async (i) => i.read()).returns(async () => Promise.reject(responseError));

            const result = await testSubject.readItem('id', dbName, collectionName, partitionKey, false);

            expect(result).toEqual(expectedResult);
            itemMock.verifyAll();
            verifyMocks();

            await expect(testSubject.readItem('id', dbName, collectionName, partitionKey)).rejects.toThrowError(
                `The Cosmos DB 'readItem' operation failed. Document Id: id Response status code: 404 Response: NotFound`,
            );
        });

        it('read item with success', async () => {
            const responseItem = {
                id: 'id-1',
                propA: 'propA',
                _etag: 'etag-1',
                _ts: 123456789,
            };
            const expectedResult = {
                item: responseItem,
                statusCode: 200,
            };
            collectionMock.setup((c) => c.item(responseItem.id, partitionKey)).returns(() => itemMock.object);
            itemMock
                .setup(async (i) => i.read())
                .returns(async () => Promise.resolve({ resource: responseItem as any, item: undefined } as any));

            const result = await testSubject.readItem(responseItem.id, dbName, collectionName, partitionKey);

            expect(result).toEqual(expectedResult);
            itemMock.verifyAll();
            verifyMocks();
        });

        it('read item with success and no partition key', async () => {
            const responseItem = {
                id: 'id-1',
                propA: 'propA',
                _etag: 'etag-1',
                _ts: 123456789,
            };
            const expectedResult = {
                item: responseItem,
                statusCode: 200,
            };
            collectionMock.setup((c) => c.item(responseItem.id, undefined)).returns(() => itemMock.object);
            itemMock
                .setup(async (i) => i.read())
                .returns(async () => Promise.resolve({ resource: responseItem as any, item: undefined } as any));

            const result = await testSubject.readItem(responseItem.id, dbName, collectionName, undefined);

            expect(result).toEqual(expectedResult);
            itemMock.verifyAll();
            verifyMocks();
        });
    });

    describe('readItems()', () => {
        it('read items with failed response', async () => {
            const expectedResult = {
                response: 'NotFound',
                statusCode: 404,
            };
            const responseError: cosmos.ErrorResponse = {
                message: 'NotFound',
                name: 'NotFound',
                code: 404,
            };
            collectionMock.setup((c) => c.items).returns(() => itemsMock.object);
            itemsMock.setup((i) => i.query('query', It.isAny())).returns(() => queryIteratorMock.object);
            queryIteratorMock.setup(async (qm) => qm.fetchNext()).returns(async () => Promise.reject(responseError));

            const result = await testSubject.readItems(dbName, collectionName, 'query', undefined, false);

            expect(result).toEqual(expectedResult);
            itemMock.verifyAll();
            verifyMocks();

            await expect(testSubject.readItems(dbName, collectionName, 'query')).rejects.toThrowError(
                `The Cosmos DB 'queryItems' operation failed. Response status code: 404 Response: NotFound`,
            );
        });

        it('read items using query', async () => {
            const query = "SELECT * from C where C.itemType = 'Page'";
            const items = [
                {
                    id: 'id-1',
                    propA: 'propA',
                    _etag: '1',
                },
                {
                    id: 'id-2',
                    propA: 'propB',
                    _etag: '1',
                },
                {
                    id: 'id-3',
                    propA: 'propC',
                    _etag: '1',
                },
            ];
            const expectedResult = {
                item: items,
                statusCode: 200,
                continuationToken: 'abdf12345fd',
            };
            collectionMock.setup((c) => c.items).returns(() => itemsMock.object);
            itemsMock.setup((i) => i.query(query, It.isAny())).returns(() => queryIteratorMock.object);
            queryIteratorMock
                .setup(async (qi) => qi.fetchNext())
                .returns(async () => Promise.resolve({ resources: items, statusCode: 200, continuationToken: 'abdf12345fd' } as any));

            const result = await testSubject.readItems(dbName, collectionName, query);

            expect(result).toEqual(expectedResult);
            itemMock.verifyAll();
            verifyMocks();
        });

        it('read items using cross partition query', async () => {
            const query = "SELECT * from C where C.itemType = 'Page'";
            const items = [
                {
                    id: 'id-1',
                    propA: 'propA',
                    _etag: '1',
                },
                {
                    id: 'id-2',
                    propA: 'propB',
                    _etag: '1',
                },
            ];
            const expectedResult = {
                item: items,
                statusCode: 200,
            };

            let iterationCount = 1;
            collectionMock.setup((c) => c.items).returns(() => itemsMock.object);
            itemsMock.setup((i) => i.query(query, It.isAny())).returns(() => queryIteratorMock.object);
            queryIteratorMock
                .setup(async (qi) => qi.fetchNext())
                .returns(async () => {
                    if (iterationCount > 1) {
                        return Promise.resolve({ resources: items, statusCode: 200 } as any);
                    }

                    iterationCount = iterationCount + 1;

                    return Promise.resolve({ resources: <any[]>[], statusCode: 200, continuationToken: 'abdf12345fd' });
                });

            const result = await testSubject.readItems(dbName, collectionName, query);

            expect(result).toEqual(expectedResult);
            itemMock.verifyAll();
            verifyMocks();
        });

        it('read items that has no content', async () => {
            const query = "SELECT * from C where C.itemType = 'Page'";
            const items: any = undefined;
            const expectedResult = {
                item: [] as any[],
                statusCode: 204,
            };

            let iterationCount = 1;
            collectionMock.setup((c) => c.items).returns(() => itemsMock.object);
            itemsMock.setup((i) => i.query(query, It.isAny())).returns(() => queryIteratorMock.object);
            queryIteratorMock
                .setup(async (qi) => qi.fetchNext())
                .returns(async () => {
                    if (iterationCount > 1) {
                        return Promise.resolve({ resources: items, statusCode: 200 } as any);
                    }

                    iterationCount = iterationCount + 1;

                    return Promise.resolve({ resources: items, statusCode: 200, continuationToken: 'abdf12345fd' });
                });

            const result = await testSubject.readItems(dbName, collectionName, query);

            expect(result).toEqual(expectedResult);
            itemMock.verifyAll();
            verifyMocks();
        });
    });

    describe('deleteItem()', () => {
        it('deletes item with failed response', async () => {
            collectionMock.setup((c) => c.item('id', partitionKey)).returns(() => itemMock.object);
            itemMock
                .setup(async (i) => i.delete())
                .returns(async () => Promise.reject(errorResponse))
                .verifiable();

            const result = await testSubject.deleteItem('id', dbName, collectionName, partitionKey, false);
            expect(result).toEqual({ response: undefined, statusCode: 500 });
            itemMock.verifyAll();
            verifyMocks();

            await expect(testSubject.deleteItem('id', dbName, collectionName, partitionKey)).rejects.toThrowError(
                `The Cosmos DB 'deleteItem' operation failed. Document Id: id Response status code: 500 Response: undefined`,
            );
        });

        it('deletes item', async () => {
            collectionMock.setup((c) => c.item('id', partitionKey)).returns(() => itemMock.object);
            const responseItem = {
                id: 'id-1',
                propA: 'propA',
                _etag: 'etag-1',
                _ts: 123456789,
            };
            const expectedResult = {
                item: responseItem,
                statusCode: 200,
            };
            itemMock
                .setup(async (i) => i.delete())
                .returns(async () => Promise.resolve({ resource: responseItem } as any))
                .verifiable();

            const result = await testSubject.deleteItem('id', dbName, collectionName, partitionKey);
            expect(result).toEqual(expectedResult);
            itemMock.verifyAll();
            verifyMocks();
        });
    });

    describe('upsertItem()', () => {
        it('upsert item with failed response', async () => {
            const item = {
                id: 'id-1',
                propA: 'propA',
                partitionKey,
            };
            const expectedResult = {
                response: 'PreconditionFailed',
                statusCode: 412,
            };
            const responseError: cosmos.ErrorResponse = {
                message: 'PreconditionFailed',
                name: 'PreconditionFailed',
                code: 412,
            };

            itemsMock.setup(async (i) => i.upsert<DbItemMock>(item, undefined)).returns(async () => Promise.reject(responseError));

            const result = await testSubject.upsertItem<DbItemMock>(item, dbName, collectionName, partitionKey, false);
            expect(result).toEqual(expectedResult);
            verifyMocks();

            await expect(testSubject.upsertItem<DbItemMock>(item, dbName, collectionName, partitionKey)).rejects.toThrowError(
                `The Cosmos DB 'upsertItem' operation failed. Document Id: id-1 Response status code: 412 Response: PreconditionFailed`,
            );
        });

        it('upsert item with etag condition with success', async () => {
            const item = {
                id: 'id-1',
                propA: 'propA',
                _etag: 'etag-1',
                partitionKey,
            };
            const responseItem = {
                id: 'id-1',
                propA: 'propA',
                _etag: 'etag-1',
                _ts: 123456789,
            };
            const expectedResult = {
                item: responseItem,
                statusCode: 200,
            };
            const options = {
                accessCondition: { type: 'IfMatch', condition: responseItem._etag },
            };

            itemsMock
                .setup(async (i) => i.upsert<DbItemMock>(item, options))
                .returns(async () => Promise.resolve({ resource: responseItem as any, item: undefined } as any));

            const result = await testSubject.upsertItem<DbItemMock>(item, dbName, collectionName, partitionKey);

            expect(result).toEqual(expectedResult);
            verifyMocks();
        });

        it('upsert item without etag condition with success', async () => {
            const item = {
                id: 'id-1',
                propA: 'propA',
                partitionKey,
            };
            const responseItem = {
                id: 'id-1',
                propA: 'propA',
                _etag: 'etag-1',
                _ts: 123456789,
            };
            const expectedResult = {
                item: responseItem,
                statusCode: 200,
            };
            itemsMock
                .setup(async (i) => i.upsert<DbItemMock>(item, undefined))
                .returns(async () => Promise.resolve({ resource: responseItem as any, item: undefined } as any));

            const result = await testSubject.upsertItem<DbItemMock>(item, dbName, collectionName, partitionKey);

            expect(result).toEqual(expectedResult);
            verifyMocks();
        });
    });

    describe('upsertItems()', () => {
        it('should upsert list of items with partition key and etag', async () => {
            const items = [
                {
                    id: 'id-1',
                    propA: 'propA',
                    _etag: '1',
                    partitionKey,
                },
                {
                    id: 'id-2',
                    propA: 'propB',
                    _etag: '1',
                    partitionKey,
                },
                {
                    id: 'id-3',
                    propA: 'propC',
                    _etag: '1',
                    partitionKey,
                },
            ];
            const options: cosmos.RequestOptions = {
                accessCondition: { type: 'IfMatch', condition: '1' },
            };
            items.map((item) => {
                setupVerifiableUpsertItemCallWithOptions(item, options);
            });

            const expectedResult = [
                { item: 'stored data', statusCode: 200 },
                { item: 'stored data', statusCode: 200 },
                { item: 'stored data', statusCode: 200 },
            ];

            const results = await testSubject.upsertItems(items, dbName, collectionName, partitionKey);
            expect(results).toEqual(expectedResult);
            verifyMocks();
        });

        it('should upsert list of items with partition key', async () => {
            const items = [
                {
                    id: 'id-1',
                    propA: 'propA',
                    _etag: '1',
                    partitionKey,
                },
                {
                    id: 'id-2',
                    propA: 'propB',
                    _etag: '1',
                    partitionKey,
                },
                {
                    id: 'id-3',
                    propA: 'propC',
                    _etag: '1',
                    partitionKey,
                },
            ];
            const options: cosmos.RequestOptions = {
                accessCondition: { type: 'IfMatch', condition: '1' },
            };
            items.map((item) => {
                setupVerifiableUpsertItemCallWithOptions(item, options);
            });

            const expectedResult = [
                { item: 'stored data', statusCode: 200 },
                { item: 'stored data', statusCode: 200 },
                { item: 'stored data', statusCode: 200 },
            ];

            const results = await testSubject.upsertItems(items, dbName, collectionName, partitionKey);
            expect(results).toEqual(expectedResult);
            verifyMocks();
        });

        it('should upsert list of items with partition key', async () => {
            const items = [
                {
                    id: 'id-1',
                    propA: 'propA',
                    _etag: '1',
                    partitionKey,
                },
                {
                    id: 'id-2',
                    propA: 'propB',
                    _etag: '1',
                    partitionKey,
                },
                {
                    id: 'id-3',
                    propA: 'propC',
                    _etag: '1',
                    partitionKey,
                },
            ];
            const options: cosmos.RequestOptions = {
                accessCondition: { type: 'IfMatch', condition: '1' },
            };
            items.map((item) => {
                setupVerifiableUpsertItemCallWithOptions(item, options);
            });

            const expectedResult = [
                { item: 'stored data', statusCode: 200 },
                { item: 'stored data', statusCode: 200 },
                { item: 'stored data', statusCode: 200 },
            ];

            const results = await testSubject.upsertItems(items, dbName, collectionName, partitionKey);
            expect(results).toEqual(expectedResult);
            verifyMocks();
        });

        it('should return fail response if one of the items failed to upsert', async () => {
            const items = [
                {
                    id: 'id-1',
                    propA: 'propA',
                    _etag: '1',
                    partitionKey,
                },
                {
                    id: 'id-2',
                    propA: 'propB',
                    _etag: '1',
                    partitionKey,
                },
            ];
            const options: cosmos.RequestOptions = {
                accessCondition: { type: 'IfMatch', condition: '1' },
            };
            setupVerifiableUpsertItemCallWithOptions(items[0], options);
            itemsMock.setup(async (i) => i.upsert(items[1], options)).returns(async () => Promise.reject(errorResponse));

            const expectedResult = [{ item: 'stored data', statusCode: 200 }, { statusCode: 500 }];

            const results = await testSubject.upsertItems(items, dbName, collectionName, partitionKey, false);
            expect(results).toEqual(expectedResult);
            verifyMocks();
        });

        it('should throw if one of the items failed to upsert', async () => {
            const items = [
                {
                    id: 'id-1',
                    propA: 'propA',
                    _etag: '1',
                    partitionKey,
                },
                {
                    id: 'id-2',
                    propA: 'propB',
                    _etag: '1',
                    partitionKey,
                },
            ];
            const options: cosmos.RequestOptions = {
                accessCondition: { type: 'IfMatch', condition: '1' },
            };
            setupVerifiableUpsertItemCallWithOptions(items[0], options);
            itemsMock.setup(async (i) => i.upsert(items[1], options)).returns(async () => Promise.reject(errorResponse));

            loggerMock.setup((o) => o.logError(`The Cosmos DB 'upsertItems' operation failed.`, It.isAny())).verifiable();

            await expect(testSubject.upsertItems(items, dbName, collectionName, partitionKey)).rejects.toThrowError(``);
            verifyMocks();
        });
    });

    function setupCosmosMocks(): void {
        cosmosClientMock = Mock.ofType<cosmos.CosmosClient>();
        dbMock = Mock.ofType(cosmos.Database);
        collectionMock = Mock.ofType(cosmos.Container);
        itemsMock = Mock.ofType(cosmos.Items);
        itemMock = Mock.ofType(cosmos.Item);
        queryIteratorMock = Mock.ofType(cosmos.QueryIterator);
        cosmosClientProviderStub = async () => cosmosClientMock.object;

        collectionMock.setup((c) => c.items).returns(() => itemsMock.object);

        getPromisableDynamicMock(cosmosClientMock);
    }

    function verifyMocks(): void {
        itemsMock.verifyAll();
        dbMock.verifyAll();
        collectionMock.verifyAll();
        cosmosClientMock.verifyAll();
        loggerMock.verifyAll();
    }

    function setupVerifiableGetDbCall(): void {
        cosmosClientMock
            .setup((c) => c.database(dbName))
            .returns(() => dbMock.object)
            .verifiable();
    }

    function setupVerifiableGetCollectionCall(): void {
        dbMock
            .setup((c) => c.container(collectionName))
            .returns(() => collectionMock.object)
            .verifiable();
    }

    function setupVerifiableUpsertItemCallWithOptions(item: any, options: cosmos.RequestOptions): void {
        itemsMock
            .setup(async (i) => i.upsert(item, options))
            .returns(async () => Promise.resolve({ resource: 'stored data' as any, item: undefined } as any));
    }
});

interface DbItemMock extends CosmosDocument {
    propA: string;
}
