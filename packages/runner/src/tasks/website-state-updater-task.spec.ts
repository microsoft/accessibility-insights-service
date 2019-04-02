// tslint:disable: no-import-side-effect
import 'reflect-metadata';
import '../test-utilities/common-mock-methods';

import { IMock, Mock, Times, It } from 'typemoq';
import { StorageClient } from '../storage/storage-client';
import { WebsiteFactory } from '../factories/website-factory';
import { RetryOptions } from '../storage/retry-options';
import { ScanMetadata } from '../types/scan-metadata';
import { Website } from '../documents/website';
import { CosmosOperationResponse } from '../azure/cosmos-operation-response';
import { PageScanResult } from '../documents/page-scan-result';
import { WebsiteStateUpdaterTask } from './website-state-updater-task';

let storageClientMock: IMock<StorageClient>;
let websiteFactoryMock: IMock<WebsiteFactory>;
let retryOptions: RetryOptions = {
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
const pageScanResult = <PageScanResult>(<unknown>{ type: 'PageScanResult' });
let websiteStateUpdaterTask: WebsiteStateUpdaterTask;

beforeEach(() => {
    storageClientMock = Mock.ofType<StorageClient>();
    websiteFactoryMock = Mock.ofType<WebsiteFactory>();

    let targetWebsiteServerItem: Website;
    storageClientMock
        .setup(o => o.writeDocument<Website>(It.isAny()))
        .callback(item => {
            targetWebsiteServerItem = item;
        })
        .returns(async () => Promise.resolve({ item: targetWebsiteServerItem, statusCode: 200 }))
        .verifiable(Times.once());

    websiteFactoryMock
        .setup(o => o.createWebsiteDocumentId(scanMetadata.baseUrl))
        .returns(() => 'websiteDocumentId')
        .verifiable(Times.once());

    websiteStateUpdaterTask = new WebsiteStateUpdaterTask(storageClientMock.object, websiteFactoryMock.object, retryOptions);
});

afterEach(() => {
    storageClientMock.verifyAll();
    websiteFactoryMock.verifyAll();
});

describe('WebsiteStateUpdaterTask', () => {
    it('create new website document', async () => {
        const websiteCreatedItem = <Website>(<unknown>{ type: 'Website', operation: 'created' });
        const websiteServerItem = createWebsiteServerItem(404);
        storageClientMock
            .setup(o => o.readDocument<Website>('websiteDocumentId'))
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
        storageClientMock
            .setup(o => o.readDocument<Website>('websiteDocumentId'))
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

function setupTryExecuteOperationCallback(): Promise<CosmosOperationResponse<Website>> {
    return new Promise(async (resolve, reject) => {
        let operationResult: CosmosOperationResponse<Website>;
        storageClientMock
            .setup(o => o.tryExecuteOperation(It.isAny(), retryOptions, pageScanResult, scanMetadata, It.isAny()))
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
