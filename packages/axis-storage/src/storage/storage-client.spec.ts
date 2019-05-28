// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any
import 'reflect-metadata';

import { Logger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { CosmosClientWrapper } from '../azure-cosmos/cosmos-client-wrapper';
import { CosmosOperationResponse } from '../azure-cosmos/cosmos-operation-response';
import { StorageClient } from './storage-client';

type OperationCallback = (...args: any[]) => Promise<CosmosOperationResponse<any>>;

const dbName = 'dbName';
const collectionName = 'collectionName';
const partitionKey = 'partKey';

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

    it('writeDocument()', async () => {
        const item = {
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
