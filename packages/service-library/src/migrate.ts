import 'reflect-metadata';

import { registerAzureServicesToContainer } from 'azure-services';
import { Container, inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { registerContextAwareLoggerToContainer, registerGlobalLoggerToContainer } from 'logger';
import { ItemType, OnDemandPageScanBatchRequest, OnDemandPageScanRequest, OnDemandPageScanResult, PartitionKey } from 'storage-documents';
import { OnDemandPageScanRunResultProvider, PageScanRequestProvider } from '.';
import { ScanDataProvider } from './data-providers/scan-data-provider';
import { PartitionKeyFactory } from './factories/partition-key-factory';
import { registerServiceLibraryToContainer } from './register-service-library-to-container';

@injectable()
export class MigrateDocuments {
    constructor(
        @inject(ScanDataProvider) private readonly scanDataProvider: ScanDataProvider,
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
    ) {}

    public async migrate(): Promise<void> {
        const batchRequests = await this.scanDataProvider.readAllScanBatchRequest();

        for (const item of batchRequests.item) {
            await this.writeRequestsToPermanentContainer(item);
            await this.writeRequestsToQueueContainer(item);
            await this.scanDataProvider.deleteBatchRequest(item);

            console.log(`Added requests to permanent container for batch request id -`, item);
        }
    }

    private async writeRequestsToPermanentContainer(batchRequest: OnDemandPageScanBatchRequest): Promise<void> {
        const scanRequest = batchRequest.scanRunBatchRequest[0];
        const requestDocument: OnDemandPageScanResult = {
            id: scanRequest.scanId,
            url: scanRequest.url,
            priority: scanRequest.priority,
            itemType: ItemType.onDemandPageScanRunResult,
            partitionKey: this.partitionKeyFactory.createPartitionKeyForDocument(ItemType.onDemandPageScanRunResult, scanRequest.scanId),
            run: {
                state: 'accepted',
                timestamp: new Date().toJSON(),
            },
            batchRequestId: batchRequest.id,
            ...(isEmpty(scanRequest.scanNotifyUrl)
                ? {}
                : {
                      notification: {
                          state: 'pending',
                          scanNotifyUrl: scanRequest.scanNotifyUrl,
                      },
                  }),
        };
        await this.onDemandPageScanRunResultProvider.writeScanRuns([requestDocument]);
        console.log(`Added requests to permanent container for scan request id - ${scanRequest.scanId}`);
    }

    private async writeRequestsToQueueContainer(batchRequest: OnDemandPageScanBatchRequest): Promise<void> {
        const scanRequest = batchRequest.scanRunBatchRequest[0];
        const scanNotifyUrl = isEmpty(scanRequest.scanNotifyUrl) ? {} : { scanNotifyUrl: scanRequest.scanNotifyUrl };

        const requestDocument: OnDemandPageScanRequest = {
            id: scanRequest.scanId,
            url: scanRequest.url,
            priority: scanRequest.priority,
            itemType: ItemType.onDemandPageScanRequest,
            partitionKey: PartitionKey.pageScanRequestDocuments,
            ...scanNotifyUrl,
        };

        await this.pageScanRequestProvider.insertRequests([requestDocument]);
        console.log(`Added requests to queue container scan request id -  ${scanRequest.scanId}`);
    }
}

const container = new Container({ autoBindInjectable: true });
registerAzureServicesToContainer(container);
registerGlobalLoggerToContainer(container);
registerContextAwareLoggerToContainer(container);
registerServiceLibraryToContainer(container);

const migrater = container.get(MigrateDocuments);

migrater.migrate();
