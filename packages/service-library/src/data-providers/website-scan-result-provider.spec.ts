// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It, Times } from 'typemoq';
import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import {
    WebsiteScanResult,
    ItemType,
    WebsiteScanResultBase,
    WebsiteScanResultPartModel,
    WebsiteScanResultPart,
    StorageDocument,
    websiteScanResultPartModelKeys,
} from 'storage-documents';
import { HashGenerator, RetryHelper, ServiceConfiguration, CrawlConfig } from 'common';
import { GlobalLogger } from 'logger';
import * as MockDate from 'mockdate';
import _ from 'lodash';
import * as cosmos from '@azure/cosmos';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { WebsiteScanResultProvider } from './website-scan-result-provider';
import { WebsiteScanResultAggregator } from './website-scan-result-aggregator';

type TestWorkflow = 'merge' | 'create' | 'skip-merge';

const maxRetryCount: number = 5;
const msecBetweenRetries: number = 1000;
const deepScanDiscoveryLimit = 2;
const scanId = 'scanId';
const websiteScanResultBaseId = 'websiteScanResultBaseId';
const websiteScanResultBasePartitionKey = 'websiteScanResultBasePartitionKey';
const websiteScanResultPartId = 'websiteScanResultPartId';

let websiteScanResultProvider: WebsiteScanResultProvider;
let cosmosContainerClientMock: IMock<CosmosContainerClient>;
let websiteScanResultAggregatorMock: IMock<WebsiteScanResultAggregator>;
let serviceConfigurationMock: IMock<ServiceConfiguration>;
let partitionKeyFactoryMock: IMock<PartitionKeyFactory>;
let retryHelperMock: IMock<RetryHelper<WebsiteScanResult>>;
let hashGeneratorMock: IMock<HashGenerator>;
let globalLoggerMock: IMock<GlobalLogger>;
let dateNow: Date;
let websiteScanResultBase: WebsiteScanResultBase;
let websiteScanResultBaseNormalized: WebsiteScanResultBase;
let websiteScanResultPartModel: WebsiteScanResultPartModel;
let websiteScanResult: WebsiteScanResult;
let websiteScanResultPartDbDocumentExisting: WebsiteScanResultPart;
let websiteScanResultPartDbDocumentMerged: WebsiteScanResultPart;
let websiteScanResultBaseDbDocumentExisting: WebsiteScanResultBase;
let websiteScanResultBaseDbDocumentCreated: WebsiteScanResultBase;
let websiteScanResultBaseDbDocumentMerged: WebsiteScanResultBase;

describe(WebsiteScanResultProvider, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
        websiteScanResultAggregatorMock = Mock.ofType<WebsiteScanResultAggregator>();
        serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
        partitionKeyFactoryMock = Mock.ofType<PartitionKeyFactory>();
        retryHelperMock = Mock.ofType<RetryHelper<WebsiteScanResult>>();
        hashGeneratorMock = Mock.ofType<HashGenerator>();
        globalLoggerMock = Mock.ofType<GlobalLogger>();

        websiteScanResultProvider = new WebsiteScanResultProvider(
            cosmosContainerClientMock.object,
            websiteScanResultAggregatorMock.object,
            serviceConfigurationMock.object,
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
        serviceConfigurationMock.verifyAll();
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

    it('merge website scan result document with db base document and reload', async () => {
        setupDocumentEntities();
        setupHashGeneratorMock();
        setupWebsiteScanResultAggregatorMock('merge');
        setupPartitionKeyFactoryMock();
        setupCosmosContainerClientMock('merge');
        setupRetryHelperMock();

        websiteScanResultProvider.read = jest.fn().mockImplementationOnce(async (websiteScanId: string, readCompleteDocument: boolean) => {
            return websiteScanId === websiteScanResultBaseId && readCompleteDocument
                ? Promise.resolve(websiteScanResult)
                : Promise.reject('Unexpected read() method invocation');
        });

        const actualWebsiteScanResult = await websiteScanResultProvider.mergeOrCreate(scanId, websiteScanResult, true);
        expect(actualWebsiteScanResult).toEqual(websiteScanResult);
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
        setupWebsiteScanResultAggregatorMock('skip-merge');
        setupPartitionKeyFactoryMock();
        setupCosmosContainerClientMock('skip-merge');
        setupRetryHelperMock();

        const actualWebsiteScanResult = await websiteScanResultProvider.mergeOrCreate(scanId, websiteScanResult);

        expect(actualWebsiteScanResult).toEqual(websiteScanResultBaseDbDocumentExisting);
    });

    it('create new website scan result db document', async () => {
        setupDocumentEntities();
        setupHashGeneratorMock();

        websiteScanResultBaseNormalized.deepScanLimit = deepScanDiscoveryLimit;

        setupWebsiteScanResultAggregatorMock('create');
        setupPartitionKeyFactoryMock();
        setupCosmosContainerClientMock('create');
        setupRetryHelperMock();
        serviceConfigurationMock
            .setup((o) => o.getConfigValue('crawlConfig'))
            .returns(() => Promise.resolve({ deepScanDiscoveryLimit: deepScanDiscoveryLimit } as CrawlConfig))
            .verifiable();

        const actualWebsiteScanResult = await websiteScanResultProvider.mergeOrCreate(scanId, websiteScanResult);

        expect(actualWebsiteScanResult).toEqual(websiteScanResultBaseDbDocumentCreated);
    });

    it('create new website scan result db document with discovery deep scan limit', async () => {
        setupDocumentEntities(['page1', 'page2', 'page3']);
        setupHashGeneratorMock();

        websiteScanResultBaseNormalized.deepScanLimit = websiteScanResultPartModel.knownPages.length + 1;

        setupWebsiteScanResultAggregatorMock('create');
        setupPartitionKeyFactoryMock();
        setupCosmosContainerClientMock('create');
        setupRetryHelperMock();
        serviceConfigurationMock
            .setup((o) => o.getConfigValue('crawlConfig'))
            .returns(() => Promise.resolve({ deepScanDiscoveryLimit: deepScanDiscoveryLimit } as CrawlConfig))
            .verifiable();

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
            .setup(async (o) => o.queryDocuments(getQuery(), undefined))
            .returns(() =>
                Promise.resolve({
                    item: [partDocuments[0]],
                    continuationToken: 'continuationToken',
                    statusCode: 200,
                } as CosmosOperationResponse<WebsiteScanResultPart[]>),
            )
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.queryDocuments(getQuery(), 'continuationToken'))
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

        const partDocumentModel = _.pick(partMergedDocuments[1], websiteScanResultPartModelKeys) as Partial<WebsiteScanResultPartModel>;
        expect(actualWebsiteScanResult).toEqual({ ...websiteScanResultBaseDbDocumentExisting, ...partDocumentModel });
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
    if (workflow === 'skip-merge') {
        cosmosContainerClientMock
            .setup(async (o) => o.readDocument(websiteScanResultBaseId, websiteScanResultBasePartitionKey, false))
            .returns(() =>
                Promise.resolve({ item: websiteScanResultBaseDbDocumentExisting } as CosmosOperationResponse<WebsiteScanResultBase>),
            )
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.readDocument(websiteScanResultPartId, websiteScanResultBasePartitionKey, false))
            .returns(() => Promise.resolve({ item: undefined } as CosmosOperationResponse<WebsiteScanResultBase>))
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.writeDocument(It.isValue(websiteScanResultPartDbDocumentMerged)))
            .returns(() =>
                Promise.resolve({ item: websiteScanResultPartDbDocumentExisting } as CosmosOperationResponse<WebsiteScanResultPart>),
            )
            .verifiable();
    }
    if (workflow === 'merge') {
        cosmosContainerClientMock
            .setup(async (o) => o.readDocument(websiteScanResultBaseId, websiteScanResultBasePartitionKey, false))
            .returns(() =>
                Promise.resolve({ item: websiteScanResultBaseDbDocumentExisting } as CosmosOperationResponse<WebsiteScanResultBase>),
            )
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.readDocument(websiteScanResultPartId, websiteScanResultBasePartitionKey, false))
            .returns(() =>
                Promise.resolve({ item: websiteScanResultPartDbDocumentExisting } as CosmosOperationResponse<WebsiteScanResultPart>),
            )
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.writeDocument(It.isValue(websiteScanResultBaseDbDocumentMerged)))
            .returns(() =>
                Promise.resolve({ item: websiteScanResultBaseDbDocumentMerged } as CosmosOperationResponse<WebsiteScanResultBase>),
            )
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.writeDocument(It.isValue(websiteScanResultPartDbDocumentMerged)))
            .returns(() =>
                Promise.resolve({ item: websiteScanResultPartDbDocumentExisting } as CosmosOperationResponse<WebsiteScanResultPart>),
            )
            .verifiable();
    }
    if (workflow === 'create') {
        cosmosContainerClientMock
            .setup(async (o) => o.readDocument(websiteScanResultBaseId, websiteScanResultBasePartitionKey, false))
            .returns(() => Promise.resolve({ item: undefined } as CosmosOperationResponse<WebsiteScanResultBase>))
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.readDocument(websiteScanResultPartId, websiteScanResultBasePartitionKey, false))
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
    if (workflow === 'create') {
        websiteScanResultAggregatorMock
            .setup((o) => o.mergeBaseDocument(websiteScanResultBaseNormalized, {}))
            .returns(() => websiteScanResultBaseDbDocumentCreated)
            .verifiable();
        websiteScanResultAggregatorMock
            .setup((o) => o.mergePartDocument(getSourceDocument(websiteScanResultPartDbDocumentExisting), {}))
            .returns(() => websiteScanResultPartDbDocumentMerged)
            .verifiable(Times.exactly(2));
    }
    if (workflow === 'merge') {
        websiteScanResultAggregatorMock
            .setup((o) => o.mergeBaseDocument(websiteScanResultBaseNormalized, websiteScanResultBaseDbDocumentExisting))
            .returns(() => websiteScanResultBaseDbDocumentMerged)
            .verifiable();
        websiteScanResultAggregatorMock
            .setup((o) =>
                o.mergePartDocument(getSourceDocument(websiteScanResultPartDbDocumentExisting), websiteScanResultPartDbDocumentExisting),
            )
            .returns(() => websiteScanResultPartDbDocumentMerged)
            .verifiable();
    }
    if (workflow === 'skip-merge') {
        websiteScanResultAggregatorMock
            .setup((o) => o.mergeBaseDocument(websiteScanResultBaseNormalized, websiteScanResultBaseDbDocumentExisting))
            .returns(() => {
                return { ...websiteScanResultBaseDbDocumentMerged, itemVersion: undefined };
            })
            .verifiable();
        websiteScanResultAggregatorMock
            .setup((o) => o.mergePartDocument(getSourceDocument(websiteScanResultPartDbDocumentExisting), {}))
            .returns(() => websiteScanResultPartDbDocumentMerged)
            .verifiable();
    }
}

function getSourceDocument(dbDocument: StorageDocument): unknown {
    const { _etag, ...document } = dbDocument;

    return document;
}

function setupDocumentEntities(knownPages: string[] = ['new page']): void {
    websiteScanResultBase = {
        baseUrl: 'baseUrl',
        scanGroupId: 'scanGroupId',
    } as WebsiteScanResultBase;
    websiteScanResultBaseNormalized = {
        ...websiteScanResultBase,
        id: websiteScanResultBaseId,
        partitionKey: websiteScanResultBasePartitionKey,
        itemType: ItemType.websiteScanResult,
    };
    websiteScanResultPartModel = {
        pageScans: [{ scanId, url: 'url' }],
        knownPages,
    } as WebsiteScanResultPartModel;
    websiteScanResultPartDbDocumentExisting = {
        ...websiteScanResultPartModel,
        id: websiteScanResultPartId,
        partitionKey: websiteScanResultBasePartitionKey,
        itemType: ItemType.websiteScanResultPart,
        baseId: websiteScanResultBaseId,
        scanId,
        _etag: 'etag-existing',
    } as WebsiteScanResultPart;
    websiteScanResultPartDbDocumentMerged = {
        ...websiteScanResultPartDbDocumentExisting,
        itemVersion: '2',
        _etag: 'etag-merged',
    };
    websiteScanResult = {
        ...websiteScanResultBase,
        ...websiteScanResultPartModel,
    } as WebsiteScanResult;
    websiteScanResultBaseDbDocumentExisting = {
        ...websiteScanResultBaseNormalized,
        _etag: 'etag-existing',
        deepScanLimit: deepScanDiscoveryLimit,
    } as WebsiteScanResultBase;
    websiteScanResultBaseDbDocumentCreated = {
        ...websiteScanResultBaseDbDocumentExisting,
        _etag: 'etag-created',
    } as WebsiteScanResultBase;
    websiteScanResultBaseDbDocumentMerged = {
        ...websiteScanResultBaseDbDocumentExisting,
        itemVersion: '2',
        _etag: 'etag-merged',
    } as WebsiteScanResultBase;
}

function getQuery(): cosmos.SqlQuerySpec {
    return {
        query: 'SELECT * FROM c WHERE c.partitionKey = @partitionKey and c.baseId = @baseId and c.itemType = @itemType',
        parameters: [
            {
                name: '@baseId',
                value: websiteScanResultBaseId,
            },
            {
                name: '@partitionKey',
                value: websiteScanResultBasePartitionKey,
            },
            {
                name: '@itemType',
                value: ItemType.websiteScanResultPart,
            },
        ],
    };
}
