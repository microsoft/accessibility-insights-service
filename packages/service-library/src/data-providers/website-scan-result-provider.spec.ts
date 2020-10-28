// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock, It } from 'typemoq';
import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { WebsiteScanResult, ItemType } from 'storage-documents';
import { HashGenerator, RetryHelper } from 'common';
import { GlobalLogger } from 'logger';
import * as MockDate from 'mockdate';
import moment from 'moment';
import _ from 'lodash';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { WebsiteScanResultProvider } from './website-scan-result-provider';

const maxRetryCount: number = 5;
const msecBetweenRetries: number = 1000;

let websiteScanResultProvider: WebsiteScanResultProvider;
let cosmosContainerClientMock: IMock<CosmosContainerClient>;
let partitionKeyFactoryMock: IMock<PartitionKeyFactory>;
let retryHelperMock: IMock<RetryHelper<WebsiteScanResult>>;
let hashGeneratorMock: IMock<HashGenerator>;
let globalLoggerMock: IMock<GlobalLogger>;
let dateNow: Date;

describe(WebsiteScanResultProvider, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
        partitionKeyFactoryMock = Mock.ofType<PartitionKeyFactory>();
        retryHelperMock = Mock.ofType<RetryHelper<WebsiteScanResult>>();
        hashGeneratorMock = Mock.ofType<HashGenerator>();
        globalLoggerMock = Mock.ofType<GlobalLogger>();

        websiteScanResultProvider = new WebsiteScanResultProvider(
            cosmosContainerClientMock.object,
            partitionKeyFactoryMock.object,
            hashGeneratorMock.object,
            globalLoggerMock.object,
            retryHelperMock.object,
        );
    });

    afterEach(() => {
        MockDate.reset();

        cosmosContainerClientMock.verifyAll();
        partitionKeyFactoryMock.verifyAll();
        retryHelperMock.verifyAll();
        hashGeneratorMock.verifyAll();
        globalLoggerMock.verifyAll();
    });

    it('merge website scan result with db document', async () => {
        const websiteScanResult = {
            baseUrl: 'baseUrl',
            scanGroupId: 'scanGroupId',
            pageScans: [
                { scanId: 'scanId-new-to-skip', url: 'url1', timestamp: moment(dateNow).add(-7, 'minute').toJSON() },
                { scanId: 'scanId-new-to-add', url: 'url2', timestamp: moment(dateNow).add(11, 'minute').toJSON() },
                { scanId: 'scanId-new-to-add', url: 'url4', timestamp: moment(dateNow).toJSON() },
            ],
        } as WebsiteScanResult;
        const websiteScanResultDbDocument = {
            ...websiteScanResult,
            id: 'websiteScanId',
            partitionKey: 'partitionKey',
            itemType: ItemType.websiteScanResult,
            _etag: 'etag',
            pageScans: [
                { scanId: 'scanId-current-to-keep', url: 'url1', timestamp: moment(dateNow).toJSON() },
                { scanId: 'scanId-current-to-remove', url: 'url2', timestamp: moment(dateNow).toJSON() },
                { scanId: 'scanId-current-to-keep', url: 'url3', timestamp: moment(dateNow).toJSON() },
            ],
        } as WebsiteScanResult;
        const websiteScanResultMergedWithDbDocument = {
            ...websiteScanResult,
            id: 'websiteScanId',
            partitionKey: 'partitionKey',
            itemType: ItemType.websiteScanResult,
            _etag: 'etag', // should preserve current db document etag
            pageScans: [
                { scanId: 'scanId-current-to-keep', url: 'url1', timestamp: moment(dateNow).toJSON() },
                { scanId: 'scanId-new-to-add', url: 'url2', timestamp: moment(dateNow).add(11, 'minute').toJSON() },
                { scanId: 'scanId-current-to-keep', url: 'url3', timestamp: moment(dateNow).toJSON() },
                { scanId: 'scanId-new-to-add', url: 'url4', timestamp: moment(dateNow).toJSON() },
            ],
        } as WebsiteScanResult;
        hashGeneratorMock
            .setup((o) => o.getWebsiteScanResultDocumentId(websiteScanResult.baseUrl, websiteScanResult.scanGroupId))
            .returns(() => websiteScanResultDbDocument.id)
            .verifiable();
        partitionKeyFactoryMock
            .setup((o) => o.createPartitionKeyForDocument(ItemType.websiteScanResult, websiteScanResultDbDocument.id))
            .returns(() => websiteScanResultDbDocument.partitionKey)
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.readDocument(websiteScanResultDbDocument.id, websiteScanResultDbDocument.partitionKey, false))
            .returns(() => Promise.resolve({ item: websiteScanResultDbDocument } as CosmosOperationResponse<WebsiteScanResult>))
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.writeDocument(It.isValue(websiteScanResultMergedWithDbDocument)))
            .returns(() => Promise.resolve({ item: websiteScanResultMergedWithDbDocument } as CosmosOperationResponse<WebsiteScanResult>))
            .verifiable();
        retryHelperMock
            .setup(async (o) => o.executeWithRetries(It.isAny(), It.isAny(), maxRetryCount, msecBetweenRetries))
            .returns(async (action: () => Promise<WebsiteScanResult>, errorHandler: (err: Error) => Promise<void>, maxRetries: number) => {
                return action();
            })
            .verifiable();

        const actualWebsiteScanResult = await websiteScanResultProvider.mergeOrCreate(websiteScanResult);

        expect(actualWebsiteScanResult).toEqual(websiteScanResultMergedWithDbDocument);
    });

    it('create new website scan result db document if not exists', async () => {
        const websiteScanResult = {
            baseUrl: 'baseUrl',
            scanGroupId: 'scanGroupId',
        } as WebsiteScanResult;
        const websiteScanResultDbDocument = {
            ...websiteScanResult,
            id: 'websiteScanId',
            partitionKey: 'partitionKey',
            itemType: ItemType.websiteScanResult,
        } as WebsiteScanResult;
        hashGeneratorMock
            .setup((o) => o.getWebsiteScanResultDocumentId(websiteScanResult.baseUrl, websiteScanResult.scanGroupId))
            .returns(() => websiteScanResultDbDocument.id)
            .verifiable();
        partitionKeyFactoryMock
            .setup((o) => o.createPartitionKeyForDocument(ItemType.websiteScanResult, websiteScanResultDbDocument.id))
            .returns(() => websiteScanResultDbDocument.partitionKey)
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.readDocument(websiteScanResultDbDocument.id, websiteScanResultDbDocument.partitionKey, false))
            .returns(() => Promise.resolve({ item: undefined } as CosmosOperationResponse<WebsiteScanResult>))
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.writeDocument(It.isValue(websiteScanResultDbDocument)))
            .returns(() => Promise.resolve({ item: websiteScanResultDbDocument } as CosmosOperationResponse<WebsiteScanResult>))
            .verifiable();
        retryHelperMock
            .setup(async (o) => o.executeWithRetries(It.isAny(), It.isAny(), maxRetryCount, msecBetweenRetries))
            .returns(async (action: () => Promise<WebsiteScanResult>, errorHandler: (err: Error) => Promise<void>, maxRetries: number) => {
                return action();
            })
            .verifiable();

        const actualWebsiteScanResult = await websiteScanResultProvider.mergeOrCreate(websiteScanResult);

        expect(actualWebsiteScanResult).toEqual(websiteScanResultDbDocument);
    });

    it('read website scan result', async () => {
        const websiteScanResult = {
            id: 'websiteScanId',
            partitionKey: 'partitionKey',
        } as WebsiteScanResult;
        partitionKeyFactoryMock
            .setup((o) => o.createPartitionKeyForDocument(ItemType.websiteScanResult, websiteScanResult.id))
            .returns(() => websiteScanResult.partitionKey)
            .verifiable();
        cosmosContainerClientMock
            .setup(async (o) => o.readDocument(websiteScanResult.id, websiteScanResult.partitionKey))
            .returns(() => Promise.resolve({ item: websiteScanResult } as CosmosOperationResponse<WebsiteScanResult>))
            .verifiable();

        const actualWebsiteScanResult = await websiteScanResultProvider.read(websiteScanResult.id);

        expect(actualWebsiteScanResult).toEqual(websiteScanResult);
    });
});
