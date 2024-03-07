// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { IMock, Mock } from 'typemoq';
import { ExponentialRetryOptions, HashGenerator, ServiceConfiguration } from 'common';
import { GlobalLogger } from 'logger';
import { ItemType, KnownPages, WebsiteScanData } from 'storage-documents';
import { cloneDeep } from 'lodash';
import { PatchOperation } from '@azure/cosmos';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { WebsiteScanDataProvider } from './website-scan-data-provider';

let cosmosContainerClientMock: IMock<CosmosContainerClient>;
let serviceConfigurationMock: IMock<ServiceConfiguration>;
let partitionKeyFactoryMock: IMock<PartitionKeyFactory>;
let hashGeneratorMock: IMock<HashGenerator>;
let loggerMock: IMock<GlobalLogger>;
let websiteScanDataProvider: WebsiteScanDataProvider;
let websiteScanDataDbDocumentExisting: WebsiteScanData;
let websiteScanDataDbDocumentNormalized: WebsiteScanData;
let websiteScanData: WebsiteScanData;

const baseUrl = 'baseUrl';
const scanGroupId = 'scanGroupId';
const websiteScanDataDocumentId = 'websiteScanDataDocumentId';
const websiteScanDataPartitionKey = 'websiteScanDataPartitionKey';
const retryOptions: ExponentialRetryOptions = {
    jitter: 'full',
    delayFirstAttempt: false,
    numOfAttempts: 1,
    maxDelay: 10,
    startingDelay: 1,
    retry: () => true,
};

describe(WebsiteScanDataProvider, () => {
    beforeEach(() => {
        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
        serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
        partitionKeyFactoryMock = Mock.ofType<PartitionKeyFactory>();
        hashGeneratorMock = Mock.ofType<HashGenerator>();
        loggerMock = Mock.ofType<GlobalLogger>();
        websiteScanDataDbDocumentExisting = {
            _ts: 1,
            knownPages: {
                hash1: 'url1|scanId1',
            } as KnownPages,
        } as WebsiteScanData;
        websiteScanDataDbDocumentNormalized = {
            id: websiteScanDataDocumentId,
            partitionKey: websiteScanDataPartitionKey,
            itemType: 'websiteScanData',
            baseUrl,
            scanGroupId,
        } as WebsiteScanData;
        websiteScanData = {
            baseUrl,
            scanGroupId,
        } as WebsiteScanData;

        websiteScanDataProvider = new WebsiteScanDataProvider(
            cosmosContainerClientMock.object,
            serviceConfigurationMock.object,
            partitionKeyFactoryMock.object,
            hashGeneratorMock.object,
            loggerMock.object,
            retryOptions,
        );
    });

    afterEach(() => {
        cosmosContainerClientMock.verifyAll();
        serviceConfigurationMock.verifyAll();
        partitionKeyFactoryMock.verifyAll();
        hashGeneratorMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('read', async () => {
        setupPartitionKeyFactoryMock();
        cosmosContainerClientMock
            .setup(async (o) => o.readDocument(websiteScanDataDocumentId, websiteScanDataPartitionKey))
            .returns(() =>
                Promise.resolve({ item: cloneDeep(websiteScanDataDbDocumentExisting) } as CosmosOperationResponse<WebsiteScanData>),
            )
            .verifiable();
        const expectedDocument = cloneDeep(websiteScanDataDbDocumentExisting);
        expectedDocument.knownPages = [
            {
                scanId: 'scanId1',
                url: 'url1',
            },
        ];

        const actualDbDocument = await websiteScanDataProvider.read(websiteScanDataDocumentId);

        expect(actualDbDocument).toEqual(expectedDocument);
    });

    it('mergeOrCreate', async () => {
        setupHashGeneratorMock();
        setupPartitionKeyFactoryMock();

        cosmosContainerClientMock
            .setup(async (o) => o.mergeOrWriteDocument(websiteScanDataDbDocumentNormalized))
            .returns(() =>
                Promise.resolve({ item: cloneDeep(websiteScanDataDbDocumentExisting) } as CosmosOperationResponse<WebsiteScanData>),
            )
            .verifiable();
        const expectedDocument = cloneDeep(websiteScanDataDbDocumentExisting);
        expectedDocument.knownPages = [
            {
                scanId: 'scanId1',
                url: 'url1',
            },
        ];

        const actualDbDocument = await websiteScanDataProvider.mergeOrCreate(websiteScanData);

        expect(actualDbDocument).toEqual(expectedDocument);
    });

    it('updateKnownPages', async () => {
        setupHashGeneratorMock();
        setupPartitionKeyFactoryMock();
        hashGeneratorMock
            .setup((o) => o.generateBase64Hash128('url1'))
            .returns(() => 'hash1')
            .verifiable();
        const patchOperation = { op: 'add', path: `/knownPages/hash1`, value: 'url1|scanId1' } as PatchOperation;
        cosmosContainerClientMock
            .setup(async (o) => o.patchDocument(websiteScanDataDocumentId, [patchOperation], websiteScanDataPartitionKey))
            .returns(() =>
                Promise.resolve({ item: cloneDeep(websiteScanDataDbDocumentExisting) } as CosmosOperationResponse<WebsiteScanData>),
            )
            .verifiable();
        const knownPages = [
            {
                scanId: 'scanId1',
                url: 'url1',
            },
        ];
        const expectedDocument = cloneDeep(websiteScanDataDbDocumentExisting);
        expectedDocument.knownPages = knownPages;

        const actualDbDocument = await websiteScanDataProvider.updateKnownPages(websiteScanData, knownPages);

        expect(actualDbDocument).toEqual(expectedDocument);
    });
});

function setupHashGeneratorMock(): void {
    hashGeneratorMock
        .setup((o) => o.getWebsiteScanDataDocumentId(baseUrl, scanGroupId))
        .returns(() => websiteScanDataDocumentId)
        .verifiable();
}

function setupPartitionKeyFactoryMock(): void {
    partitionKeyFactoryMock
        .setup((o) => o.createPartitionKeyForDocument(ItemType.websiteScanData, websiteScanDataDocumentId))
        .returns(() => websiteScanDataPartitionKey)
        .verifiable();
}
