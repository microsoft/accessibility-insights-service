// tslint:disable: no-import-side-effect no-any
import 'reflect-metadata';

import * as cosmos from '@azure/cosmos';
import { IMock, Mock } from 'typemoq';
import { ItemType } from '../test-utilities/test-document-types/item-type';
import { StorageDocument } from '../test-utilities/test-document-types/storage-document';
import { CosmosClientWrapper } from './cosmos-client-wrapper';

describe('CosmosClientWrapper', () => {
    let testSubject: CosmosClientWrapper;
    let cosmosClientMock: IMock<cosmos.CosmosClient>;
    let databasesMock: IMock<cosmos.Databases>;
    let dbMock: IMock<cosmos.Database>;
    let collectionMock: IMock<cosmos.Container>;
    let collectionsMock: IMock<cosmos.Containers>;
    let itemsMock: IMock<cosmos.Items>;
    let itemMock: IMock<cosmos.Item>;
    const partitoningKey = 'partKey';

    const dbName = 'stub db';
    const collectionName = 'stub collection';

    beforeEach(() => {
        setupCosmosMocks();
        setupVerifiableGetOrCreateDbCall();
        setupVerifiableGetOrCreateCollectionCall();
        testSubject = new CosmosClientWrapper(cosmosClientMock.object);
    });

    describe('readItem()', () => {
        it('read item with failed response ', async () => {
            const expectedResult = {
                response: 'NotFound',
                statusCode: 404,
            };
            const responseError: cosmos.ErrorResponse = {
                body: 'NotFound',
                code: 404,
            };
            collectionMock.setup(c => c.item('id')).returns(() => itemMock.object);
            itemMock.setup(async i => i.read({ partitionKey: partitoningKey })).returns(async () => Promise.reject(responseError));

            const result = await testSubject.readItem('id', dbName, collectionName, partitoningKey);

            expect(result).toEqual(expectedResult);
            itemMock.verifyAll();
            verifyMocks();
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
            collectionMock.setup(c => c.item(responseItem.id)).returns(() => itemMock.object);
            itemMock
                .setup(async i => i.read({ partitionKey: partitoningKey }))
                .returns(async () => Promise.resolve({ body: responseItem as any, item: undefined }));

            const result = await testSubject.readItem(responseItem.id, dbName, collectionName, partitoningKey);

            expect(result).toEqual(expectedResult);
            itemMock.verifyAll();
            verifyMocks();
        });

        it('read item with success with no partition key', async () => {
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
            collectionMock.setup(c => c.item(responseItem.id)).returns(() => itemMock.object);
            itemMock
                .setup(async i => i.read(undefined))
                .returns(async () => Promise.resolve({ body: responseItem as any, item: undefined }));

            const result = await testSubject.readItem(responseItem.id, dbName, collectionName);

            expect(result).toEqual(expectedResult);
            itemMock.verifyAll();
            verifyMocks();
        });
    });

    describe('upsertItem()', () => {
        it('upsert item with failed response', async () => {
            const item = {
                id: 'id-1',
                itemType: ItemType.page,
                propA: 'propA',
            };
            const expectedResult = {
                response: 'PreconditionFailed',
                statusCode: 412,
            };
            const responseError: cosmos.ErrorResponse = {
                body: 'PreconditionFailed',
                code: 412,
            };

            itemsMock.setup(async i => i.upsert<DbItemMock>(item, undefined)).returns(async () => Promise.reject(responseError));

            const result = await testSubject.upsertItem<DbItemMock>(item, dbName, collectionName);

            expect(result).toEqual(expectedResult);
            verifyMocks();
        });

        it('upsert item with etag condition with success', async () => {
            const item = {
                id: 'id-1',
                itemType: ItemType.page,
                propA: 'propA',
                _etag: 'etag-1',
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
                .setup(async i => i.upsert<DbItemMock>(item, options))
                .returns(async () => Promise.resolve({ body: responseItem as any, item: undefined }));

            const result = await testSubject.upsertItem<DbItemMock>(item, dbName, collectionName);

            expect(result).toEqual(expectedResult);
            verifyMocks();
        });

        it('upsert item without etag condition with success', async () => {
            const item = {
                id: 'id-1',
                itemType: ItemType.page,
                propA: 'propA',
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
                .setup(async i => i.upsert<DbItemMock>(item, undefined))
                .returns(async () => Promise.resolve({ body: responseItem as any, item: undefined }));

            const result = await testSubject.upsertItem<DbItemMock>(item, dbName, collectionName);

            expect(result).toEqual(expectedResult);
            verifyMocks();
        });
    });

    describe('upsertItems()', () => {
        it('should upsert list of items with partition key and etag', async () => {
            const items = [
                {
                    id: 'id-1',
                    itemType: ItemType.page,
                    propA: 'propA',
                    _etag: '1',
                },
                {
                    id: 'id-2',
                    itemType: ItemType.page,
                    propA: 'propB',
                    _etag: '1',
                },
                {
                    id: 'id-3',
                    itemType: ItemType.page,
                    propA: 'propC',
                    _etag: '1',
                },
            ];
            const options: cosmos.RequestOptions = {
                partitionKey: partitoningKey,
                accessCondition: { type: 'IfMatch', condition: '1' },
            };
            items.map(item => {
                setupVerifiableUpsertItemCallWithOptions(item, options);
            });

            await testSubject.upsertItems(items, dbName, collectionName, partitoningKey);

            verifyMocks();
        });

        it('should upsert list of items with partition key', async () => {
            const items = [1, 2, 3];
            const options: cosmos.RequestOptions = { partitionKey: partitoningKey };
            items.map(item => {
                setupVerifiableUpsertItemCallWithOptions(item, options);
            });

            await testSubject.upsertItems(items, dbName, collectionName, partitoningKey);

            verifyMocks();
        });

        it('should upsert list of items with partition key', async () => {
            const items = [1, 2, 3];
            const options: cosmos.RequestOptions = { partitionKey: partitoningKey };
            items.map(item => {
                setupVerifiableUpsertItemCallWithOptions(item, options);
            });

            await testSubject.upsertItems(items, dbName, collectionName, partitoningKey);

            verifyMocks();
        });

        it('should fail if one of the items failed to upsert', async () => {
            const items = [1, 2];
            setupVerifiableUpsertItemCall(items[0]);
            setupVerifiableRejectedUpsertItemCall(items[1]);

            await expect(testSubject.upsertItems(items, dbName, collectionName)).rejects.toEqual('unable to store item');

            verifyMocks();
        });
    });

    function setupCosmosMocks(): void {
        cosmosClientMock = Mock.ofType<cosmos.CosmosClient>();
        databasesMock = Mock.ofType(cosmos.Databases);
        dbMock = Mock.ofType(cosmos.Database);
        collectionMock = Mock.ofType(cosmos.Container);
        collectionsMock = Mock.ofType(cosmos.Containers);
        itemsMock = Mock.ofType(cosmos.Items);
        itemMock = Mock.ofType(cosmos.Item);

        collectionMock.setup(c => c.items).returns(() => itemsMock.object);
        dbMock.setup(d => d.containers).returns(() => collectionsMock.object);
        cosmosClientMock.setup(c => c.databases).returns(() => databasesMock.object);
    }

    function verifyMocks(): void {
        itemsMock.verifyAll();
        dbMock.verifyAll();
        collectionMock.verifyAll();
        databasesMock.verifyAll();
        collectionsMock.verifyAll();
        cosmosClientMock.verifyAll();
    }

    function setupVerifiableGetOrCreateDbCall(): void {
        databasesMock
            .setup(async d => d.createIfNotExists({ id: dbName }))
            .returns(async () => Promise.resolve({ database: dbMock.object }))
            .verifiable();
    }

    function setupVerifiableGetOrCreateCollectionCall(): void {
        collectionsMock
            .setup(async d => d.createIfNotExists({ id: collectionName }, { offerThroughput: 10000 }))
            .returns(async () => Promise.resolve({ container: collectionMock.object }))
            .verifiable();
    }

    function setupVerifiableUpsertItemCall(item: any): void {
        itemsMock.setup(async i => i.upsert(item)).returns(async () => Promise.resolve({ body: 'stored data' as any, item: undefined }));
    }

    function setupVerifiableUpsertItemCallWithOptions(item: any, options: cosmos.RequestOptions): void {
        itemsMock
            .setup(async i => i.upsert(item, options))
            .returns(async () => Promise.resolve({ body: 'stored data' as any, item: undefined }));
    }

    function setupVerifiableRejectedUpsertItemCall(item: any): void {
        itemsMock.setup(async i => i.upsert(item, undefined)).returns(async () => Promise.reject('unable to store item'));
    }
});

interface DbItemMock extends StorageDocument {
    propA: string;
}
