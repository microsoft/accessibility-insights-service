import * as cosmos from '@azure/cosmos';
import { IMock, Mock } from 'typemoq';
import { CosmosClientWrapper } from './cosmos-client-wrapper';
// tslint:disable: no-any

describe('CosmosClientWrapper', () => {
    let testSubject: CosmosClientWrapper;
    let cosmosClientMock: IMock<cosmos.CosmosClient>;
    let databasesMock: IMock<cosmos.Databases>;
    let dbMock: IMock<cosmos.Database>;
    let collectionMock: IMock<cosmos.Container>;
    let collectionsMock: IMock<cosmos.Containers>;
    let itemsMock: IMock<cosmos.Items>;

    const dbName = 'stub db';
    const collectionName = 'stub collection';

    beforeEach(() => {
        setupCosmosMocks();

        testSubject = new CosmosClientWrapper(cosmosClientMock.object);
    });

    describe('upsert items', () => {
        it('should upsert list of times', async () => {
            const items = [1, 2, 3];
            setupVerifiableGetOrCreateDbCall();
            setupVerifiableGetOrCreateCollectionCall();

            items.map(i => setupVerifiableUpsertItemCall);

            await testSubject.upsertItems(dbName, collectionName, items);

            verifyMocks();
        });

        it('should fail if one of the items failed to upsert', async () => {
            const items = [1, 2];
            setupVerifiableGetOrCreateDbCall();
            setupVerifiableGetOrCreateCollectionCall();

            setupVerifiableUpsertItemCall(items[0]);
            setupVerifiableRejectedUpsertItemCall(items[1]);

            await expect(testSubject.upsertItems(dbName, collectionName, items)).rejects.toEqual('unable to store item');

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
            .setup(async d => d.createIfNotExists({ id: collectionName }))
            .returns(async () => Promise.resolve({ container: collectionMock.object }))
            .verifiable();
    }

    function setupVerifiableUpsertItemCall(item: any): void {
        itemsMock.setup(async i => i.upsert(item)).returns(async () => Promise.resolve({ body: 'stored data' as any, item: undefined }));
    }

    function setupVerifiableRejectedUpsertItemCall(item: any): void {
        itemsMock.setup(async i => i.upsert(item)).returns(async () => Promise.reject('unable to store item'));
    }
});
