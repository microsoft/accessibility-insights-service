// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-object-literal-type-assertion no-unsafe-any
import 'reflect-metadata';
import '../../test-utilities/common-mock-methods';

import { CosmosContainerClient, CosmosOperationResponse, RetryOptions } from 'azure-services';
import { Logger } from 'logger';
import { PageScanResult, Website } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { WebsiteFactory } from '../factories/website-factory';
import { ScanMetadata } from '../types/scan-metadata';
import { WebsiteStateUpdaterTask } from './website-state-updater-task';

let cosmosContainerClientMock: IMock<CosmosContainerClient>;
let websiteFactoryMock: IMock<WebsiteFactory>;
const retryOptions: RetryOptions = {
    timeoutMilliseconds: 15000,
    intervalMilliseconds: 500,
    retryingOnStatusCodes: [412 /* PreconditionFailed */],
};
const scanMetadata: ScanMetadata = {
    websiteId: 'websiteId',
    websiteName: 'websiteName',
    baseUrl: 'scanMetadata-baseUrl',
    scanUrl: 'scanMetadata-scanUrl',
    serviceTreeId: 'serviceTreeId',
};
let pageScanResult: PageScanResult;
let websiteStateUpdaterTask: WebsiteStateUpdaterTask;
let loggerMock: IMock<Logger>;
const websitePartitioningKey = 'website';

beforeEach(() => {
    cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
    websiteFactoryMock = Mock.ofType<WebsiteFactory>();

    pageScanResult = <PageScanResult>(<unknown>{ type: 'PageScanResult' });

    let targetWebsiteServerItem: Website;
    cosmosContainerClientMock
        .setup(async o => o.writeDocument<Website>(It.isAny(), loggerMock.object, websitePartitioningKey))
        .callback(item => {
            targetWebsiteServerItem = item;
        })
        .returns(async () => Promise.resolve({ item: targetWebsiteServerItem, statusCode: 200 }))
        .verifiable(Times.once());

    websiteFactoryMock
        .setup(o => o.createWebsiteDocumentId(scanMetadata.baseUrl))
        .returns(() => 'websiteDocumentId')
        .verifiable(Times.once());

    loggerMock = Mock.ofType(Logger);

    websiteStateUpdaterTask = new WebsiteStateUpdaterTask(
        cosmosContainerClientMock.object,
        websiteFactoryMock.object,
        loggerMock.object,
        retryOptions,
    );
});

afterEach(() => {
    cosmosContainerClientMock.verifyAll();
    websiteFactoryMock.verifyAll();
});

describe('WebsiteStateUpdaterTask', () => {
    it('create new website document', async () => {
        const websiteCreatedItem = <Website>(<unknown>{ type: 'Website', operation: 'created' });
        const websiteServerItem = createWebsiteServerItem(404);
        cosmosContainerClientMock
            .setup(async o => o.readDocument<Website>('websiteDocumentId', loggerMock.object, websitePartitioningKey))
            .returns(async () => Promise.resolve(websiteServerItem))
            .verifiable(Times.once());
        websiteFactoryMock
            .setup(o => o.create(pageScanResult, scanMetadata, It.isAny()))
            .returns(() => websiteCreatedItem)
            .verifiable(Times.once());
        const expectedResult = {
            item: websiteCreatedItem,
            statusCode: 200,
        };
        const operationResultPromise = setupTryExecuteOperationCallback();

        await websiteStateUpdaterTask.update(pageScanResult, scanMetadata, new Date());
        const result = await operationResultPromise;

        expect(result).toEqual(expectedResult);
    });

    it('update existing website document', async () => {
        const websiteUpdatedItem = <Website>(<unknown>{ type: 'Website', operation: 'updated' });
        const websiteServerItem = createWebsiteServerItem(200);
        cosmosContainerClientMock
            .setup(async o => o.readDocument<Website>('websiteDocumentId', loggerMock.object, websitePartitioningKey))
            .returns(async () => Promise.resolve(websiteServerItem))
            .verifiable(Times.once());
        websiteFactoryMock
            .setup(o => o.update(websiteServerItem.item, pageScanResult, It.isAny()))
            .returns(() => websiteUpdatedItem)
            .verifiable(Times.once());
        const expectedResult = {
            item: websiteUpdatedItem,
            statusCode: 200,
        };
        const operationResultPromise = setupTryExecuteOperationCallback();

        await websiteStateUpdaterTask.update(pageScanResult, scanMetadata, new Date());
        const result = await operationResultPromise;

        expect(result).toEqual(expectedResult);
    });
});

async function setupTryExecuteOperationCallback(): Promise<CosmosOperationResponse<Website>> {
    return new Promise(async (resolve, reject) => {
        let operationResult: CosmosOperationResponse<Website>;
        cosmosContainerClientMock
            .setup(async o => o.tryExecuteOperation(It.isAny(), retryOptions, loggerMock.object, pageScanResult, scanMetadata, It.isAny()))
            .callback(async (operation, options, scanResult, metadata, timestamp) => {
                try {
                    operationResult = await operation(scanResult, metadata, timestamp);
                    resolve(operationResult);
                } catch (error) {
                    reject(error);
                }
            })
            .returns(async () => Promise.resolve(operationResult))
            .verifiable(Times.once());
    });
}

function createWebsiteServerItem(statusCode: number): CosmosOperationResponse<Website> {
    return <CosmosOperationResponse<Website>>{
        type: 'CosmosOperationResponse<Website>',
        statusCode: statusCode,
        item: <Website>(<unknown>{ type: 'Website', operation: 'read' }),
    };
}
