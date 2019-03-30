// tslint:disable: no-import-side-effect
import 'reflect-metadata';
import '../test-utilities/common-mock-methods';

import { CosmosClientWrapper } from '../azure/cosmos-client-wrapper';
import { IMock, Mock, Times } from 'typemoq';
import { StorageClient } from './storage-client';
import { CosmosOperationResponse } from '../azure/cosmos-operation-response';

type OperationCallback = (...args: any[]) => Promise<CosmosOperationResponse<any>>;

const dbName = 'dbName';
const collectionName = 'collectionName';
let cosmosClientWrapperMock: IMock<CosmosClientWrapper>;
let storageClient: StorageClient;
let operationCallbackMock: IMock<OperationCallback>;

beforeEach(() => {
    cosmosClientWrapperMock = Mock.ofType<CosmosClientWrapper>();
    operationCallbackMock = Mock.ofType<OperationCallback>();
    storageClient = new StorageClient(cosmosClientWrapperMock.object, dbName, collectionName);
});

describe('tryExecuteOperation()', () => {
    it('invoke operation callback', async () => {
        const item = {
            value: 'value',
        };
        const expectedResult = {
            item: item,
            statusCode: 200,
        };
        operationCallbackMock
            .setup(o => o('arg1', 'arg2'))
            .returns(async () => Promise.resolve({ statusCode: 200, item: item }))
            .verifiable(Times.once());

        const result = await storageClient.tryExecuteOperation(operationCallbackMock.object, 1, 1, 'arg1', 'arg2');

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
            .setup(o => o.upsertItems(items, dbName, collectionName))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());

        await storageClient.writeDocuments(items);

        cosmosClientWrapperMock.verifyAll();
    });

    it('writeDocument()', async () => {
        const item = {
            value: 'value',
        };
        const expectedResult = {
            item: item,
            statusCode: 200,
        };
        cosmosClientWrapperMock
            .setup(o => o.upsertItem(item, dbName, collectionName))
            .returns(async () => Promise.resolve({ statusCode: 200, item: item }))
            .verifiable(Times.once());

        const result = await storageClient.writeDocument(item);

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
            .setup(o => o.readItem('id', dbName, collectionName))
            .returns(async () => Promise.resolve({ statusCode: 200, item: item }))
            .verifiable(Times.once());

        const result = await storageClient.readDocument('id');

        expect(result).toEqual(expectedResult);
        cosmosClientWrapperMock.verifyAll();
    });
});
