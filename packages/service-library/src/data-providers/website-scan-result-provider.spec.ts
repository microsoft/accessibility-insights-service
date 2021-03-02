// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock, It } from 'typemoq';
import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { WebsiteScanResult, ItemType, WebsiteScanResultBase, WebsiteScanResultPartModel, WebsiteScanResultPart } from 'storage-documents';
import { HashGenerator, RetryHelper } from 'common';
import { GlobalLogger } from 'logger';
import * as MockDate from 'mockdate';
import _ from 'lodash';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { WebsiteScanResultProvider } from './website-scan-result-provider';
import { WebsiteScanResultAggregator } from './website-scan-result-aggregator';

type TestWorkflow = 'merge' | 'create';

const maxRetryCount: number = 5;
const msecBetweenRetries: number = 1000;
const scanId = 'scanId';
const websiteScanResultBaseId = 'websiteScanResultBaseId';
const websiteScanResultBasePartitionKey = 'websiteScanResultBasePartitionKey';
const websiteScanResultPartId = 'websiteScanResultPartId';

let websiteScanResultProvider: WebsiteScanResultProvider;
let cosmosContainerClientMock: IMock<CosmosContainerClient>;
let websiteScanResultAggregatorMock: IMock<WebsiteScanResultAggregator>;
let partitionKeyFactoryMock: IMock<PartitionKeyFactory>;
let retryHelperMock: IMock<RetryHelper<WebsiteScanResult>>;
let hashGeneratorMock: IMock<HashGenerator>;
let globalLoggerMock: IMock<GlobalLogger>;
let dateNow: Date;
let websiteScanResultBase: WebsiteScanResultBase;
let websiteScanResultPartModel: WebsiteScanResultPartModel;
let websiteScanResultPart: WebsiteScanResultPart;
let websiteScanResult: WebsiteScanResult;
let websiteScanResultBaseDbDocumentExisting: WebsiteScanResultBase;
let websiteScanResultBaseDbDocumentCreated: WebsiteScanResultBase;
let websiteScanResultBaseDbDocumentMerged: WebsiteScanResultBase;

describe(WebsiteScanResultProvider, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
        websiteScanResultAggregatorMock = Mock.ofType<WebsiteScanResultAggregator>();
        partitionKeyFactoryMock = Mock.ofType<PartitionKeyFactory>();
        retryHelperMock = Mock.ofType<RetryHelper<WebsiteScanResult>>();
        hashGeneratorMock = Mock.ofType<HashGenerator>();
        globalLoggerMock = Mock.ofType<GlobalLogger>();

        websiteScanResultProvider = new WebsiteScanResultProvider(
            cosmosContainerClientMock.object,
            websiteScanResultAggregatorMock.object,
            partitionKeyFactoryMock.object,
            hashGeneratorMock.object,
            globalLoggerMock.object,
            retryHelperMock.object,
        );
    });

    afterEach(() => {
        MockDate.reset();

        cosmosContainerClientMock.verifyAll();
        websiteScanResultAggregatorMock.verifyAll();
        partitionKeyFactoryMock.verifyAll();
        retryHelperMock.verifyAll();
        hashGeneratorMock.verifyAll();
        globalLoggerMock.verifyAll();
    });

    it('merge website scan result document with db base document', async () => {
        setupDocumentEntities();
        setupHashGeneratorMock();
        setupWebsiteScanResultAggregatorMock('merge');
        setupPartitionKeyFactoryMock();
        setupCosmosContainerClientMock('merge');
        setupRetryHelperMock();

        const actualWebsiteScanResult = await websiteScanResultProvider.mergeOrCreate(scanId, websiteScanResult);

        expect(actualWebsiteScanResult).toEqual(websiteScanResultBaseDbDocumentMerged);
    });

    it('write website scan result documents in batch', async () => {
        setupDocumentEntities();
        setupHashGeneratorMock();
        setupWebsiteScanResultAggregatorMock('merge');
        setupPartitionKeyFactoryMock();
        setupCosmosContainerClientMock('merge');
        setupRetryHelperMock();

        await websiteScanResultProvider.mergeOrCreateBatch([{ scanId, websiteScanResult }]);
    });

    it('skip merge website scan result document with db base document', async () => {
        setupDocumentEntities();
        setupHashGeneratorMock();
        setupWebsiteScanResultAggregatorMock('merge');
        setupPartitionKeyFactoryMock();
        setupCosmosContainerClientMock('merge');
        setupRetryHelperMock();

        const actualWebsiteScanResult = await websiteScanResultProvider.mergeOrCreate(scanId, websiteScanResult);

        expect(actualWebsiteScanResult).toEqual(websiteScanResultBaseDbDocumentMerged);
    });

    it('create new website scan result db document', async () => {
        setupDocumentEntities();
        setupHashGeneratorMock();
        setupWebsiteScanResultAggregatorMock('create');
        setupPartitionKeyFactoryMock();
        setupCosmosContainerClientMock('create');
        setupRetryHelperMock();

        const actualWebsiteScanResult = await websiteScanResultProvider.mergeOrCreate(scanId, websiteScanResult);

        expect(actualWebsiteScanResult).toEqual(websiteScanResultBaseDbDocumentCreated);
    });

    it('read partial website scan result', async () => {
        setupDocumentEntities();
        setupPartitionKeyFactoryMock();
        cosmosContainerClientMock
            .setup(async (o) => o.readDocument(websiteScanResultBaseId, websiteScanResultBasePartitionKey))
            .returns(() => Promise.resolve({ item: websiteScanResultBaseDbDocumentExisting } as CosmosOperationResponse<WebsiteScanResult>))
            .verifiable();

        const actualWebsiteScanResult = await websiteScanResultProvider.read(websiteScanResultBaseId, false);

        expect(actualWebsiteScanResult).toEqual(websiteScanResultBaseDbDocumentExisting);
    });

    it('read complete website scan result', async () => {
        const query = `SELECT * FROM c WHERE c.partitionKey = "${websiteScanResultBasePartitionKey}" and c.baseId = "${websiteScanResultBaseId}" and c.itemType = "${ItemType.websiteScanResultPart}"`;
        const partDocuments = [
            {
                id: 'id1',
            },
            {
                id: 'id2',
            },
        ] as WebsiteScanResultPart[];
        const partMergedDocuments = [
            {
                id: 'id1-merged',
            },
            {
                id: 'id2-merged',
            },
        ] as WebsiteScanResultPart[];

        setupDocumentEntities();
        setupPartitionKeyFactoryMock();
        cosmosContainerClientMock
            .setup(async (o) => o.readDocument(websiteScanResultBaseId, websiteScanResultBasePartitionKey))
            .returns(() => Promise.resolve({ item: websiteScanResultBaseDbDocumentExisting } as CosmosOperationResponse<WebsiteScanResult>))
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.queryDocuments(query, undefined))
            .returns(() =>
                Promise.resolve({
                    item: [partDocuments[0]],
                    continuationToken: 'continuationToken',
                    statusCode: 200,
                } as CosmosOperationResponse<WebsiteScanResultPart[]>),
            )
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.queryDocuments(query, 'continuationToken'))
            .returns(() =>
                Promise.resolve({ item: [partDocuments[1]], continuationToken: undefined, statusCode: 200 } as CosmosOperationResponse<
                    WebsiteScanResultPart[]
                >),
            )
            .verifiable();

        websiteScanResultAggregatorMock
            .setup((o) => o.mergePartDocument(partDocuments[0], {}))
            .returns(() => partMergedDocuments[0])
            .verifiable();
        websiteScanResultAggregatorMock
            .setup((o) => o.mergePartDocument(partDocuments[1], partMergedDocuments[0]))
            .returns(() => partMergedDocuments[1])
            .verifiable();

        const actualWebsiteScanResult = await websiteScanResultProvider.read(websiteScanResultBaseId, true);

        expect(actualWebsiteScanResult).toEqual({ ...websiteScanResultBaseDbDocumentExisting, ...partMergedDocuments[1] });
    });
});

function setupHashGeneratorMock(): void {
    hashGeneratorMock
        .setup((o) => o.getWebsiteScanResultPartDocumentId(websiteScanResultBaseId, scanId))
        .returns(() => websiteScanResultPartId)
        .verifiable();
    hashGeneratorMock
        .setup((o) => o.getWebsiteScanResultDocumentId(websiteScanResult.baseUrl, websiteScanResult.scanGroupId))
        .returns(() => websiteScanResultBaseId)
        .verifiable();
}

function setupPartitionKeyFactoryMock(): void {
    partitionKeyFactoryMock
        .setup((o) => o.createPartitionKeyForDocument(ItemType.websiteScanResult, websiteScanResultBaseId))
        .returns(() => websiteScanResultBasePartitionKey)
        .verifiable();
}

function setupCosmosContainerClientMock(workflow: TestWorkflow): void {
    cosmosContainerClientMock
        .setup(async (o) => o.writeDocument(It.isValue(websiteScanResultPart)))
        .returns(() => Promise.resolve({ item: websiteScanResultPart } as CosmosOperationResponse<WebsiteScanResultPart>))
        .verifiable();

    if (workflow === 'merge') {
        cosmosContainerClientMock
            .setup(async (o) => o.writeDocument(It.isValue(websiteScanResultBaseDbDocumentMerged)))
            .returns(() =>
                Promise.resolve({ item: websiteScanResultBaseDbDocumentMerged } as CosmosOperationResponse<WebsiteScanResultBase>),
            )
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.readDocument(websiteScanResultBaseId, websiteScanResultBasePartitionKey, false))
            .returns(() =>
                Promise.resolve({ item: websiteScanResultBaseDbDocumentExisting } as CosmosOperationResponse<WebsiteScanResultBase>),
            )
            .verifiable();
    }
    if (workflow === 'create') {
        cosmosContainerClientMock
            .setup(async (o) => o.readDocument(websiteScanResultBaseId, websiteScanResultBasePartitionKey, false))
            .returns(() => Promise.resolve({ item: undefined } as CosmosOperationResponse<WebsiteScanResultBase>))
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.writeDocument(It.isValue(websiteScanResultBaseDbDocumentCreated)))
            .returns(() =>
                Promise.resolve({ item: websiteScanResultBaseDbDocumentCreated } as CosmosOperationResponse<WebsiteScanResultBase>),
            )
            .verifiable();
    }
}

function setupRetryHelperMock(): void {
    retryHelperMock
        .setup(async (o) => o.executeWithRetries(It.isAny(), It.isAny(), maxRetryCount, msecBetweenRetries))
        .returns(async (action: () => Promise<WebsiteScanResult>, errorHandler: (err: Error) => Promise<void>, maxRetries: number) => {
            return action();
        })
        .verifiable();
}

function setupWebsiteScanResultAggregatorMock(workflow: TestWorkflow): void {
    const { _etag, ...document } = websiteScanResultBaseDbDocumentCreated;
    if (workflow === 'create') {
        websiteScanResultAggregatorMock
            .setup((o) => o.mergeBaseDocument(document, {}))
            .returns(() => websiteScanResultBaseDbDocumentCreated)
            .verifiable();
    }
    if (workflow === 'merge') {
        websiteScanResultAggregatorMock
            .setup((o) => o.mergeBaseDocument(document, websiteScanResultBaseDbDocumentExisting))
            .returns(() => websiteScanResultBaseDbDocumentMerged)
            .verifiable();
    }
    websiteScanResultAggregatorMock
        .setup((o) => o.mergePartDocument(websiteScanResultPart, {}))
        .returns(() => websiteScanResultPart)
        .verifiable();
}

function setupDocumentEntities(): void {
    websiteScanResultBase = {
        baseUrl: 'baseUrl',
        scanGroupId: 'scanGroupId',
    } as WebsiteScanResultBase;
    websiteScanResultPartModel = {
        pageScans: [{ scanId, url: 'url' }],
        knownPages: ['new page'],
    } as WebsiteScanResultPartModel;
    websiteScanResultPart = {
        ...websiteScanResultPartModel,
        id: websiteScanResultPartId,
        partitionKey: websiteScanResultBasePartitionKey,
        itemType: ItemType.websiteScanResultPart,
        baseId: websiteScanResultBaseId,
        scanId,
    } as WebsiteScanResultPart;
    websiteScanResult = {
        ...websiteScanResultBase,
        ...websiteScanResultPartModel,
    } as WebsiteScanResult;
    websiteScanResultBaseDbDocumentExisting = {
        ...websiteScanResultBase,
        id: websiteScanResultBaseId,
        partitionKey: websiteScanResultBasePartitionKey,
        itemType: ItemType.websiteScanResult,
        _etag: 'etag-existing',
    } as WebsiteScanResultBase;
    websiteScanResultBaseDbDocumentCreated = {
        ...websiteScanResultBase,
        id: websiteScanResultBaseId,
        partitionKey: websiteScanResultBasePartitionKey,
        itemType: ItemType.websiteScanResult,
        _etag: 'etag-created',
    } as WebsiteScanResultBase;
    websiteScanResultBaseDbDocumentMerged = {
        ...websiteScanResultBase,
        id: websiteScanResultBaseId,
        partitionKey: websiteScanResultBasePartitionKey,
        itemType: ItemType.websiteScanResult,
        _etag: 'etag-merged',
    } as WebsiteScanResultBase;
}
