// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { GuidGenerator, HashGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { OnDemandPageScanRunResultProvider, PageScanRequestProvider, WebController } from 'service-library';
import {
    ItemType,
    OnDemandPageScanBatchRequest,
    OnDemandPageScanRequest,
    OnDemandPageScanResult,
    PartitionKey,
    ScanRunBatchRequest,
} from 'storage-documents';

// tslint:disable: no-any

@injectable()
export class ScanBatchRequestFeedController extends WebController {
    public static readonly partitionKeyPreFix = 'pageScanRequest';
    public readonly apiVersion = '1.0';
    public readonly apiName = 'scan-batch-request-feed';

    public constructor(
        @inject(HashGenerator) private readonly hashGenerator: HashGenerator,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(cosmosContainerClientTypes.OnDemandScanRequestsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) protected readonly logger: Logger,
    ) {
        super();
    }

    public async handleRequest(...args: any[]): Promise<void> {
        const batchDocuments = <OnDemandPageScanBatchRequest[]>args[0];
        await Promise.all(
            batchDocuments.map(async document => {
                await this.processDocument(document);
            }),
        );
    }

    protected validateRequest(...args: any[]): boolean {
        const batchDocuments = <OnDemandPageScanBatchRequest[]>args[0];

        return this.validateRequestData(batchDocuments);
    }

    private async processDocument(batchDocument: OnDemandPageScanBatchRequest): Promise<void> {
        const requests = batchDocument.scanRunBatchRequest.filter(request => request.scanId !== undefined);
        if (requests.length > 0) {
            await this.writeRequestsToQueueContainer(requests);
            await this.writeRequestsToPermanentContainer(requests);
            await this.cosmosContainerClient.deleteDocument(batchDocument.id, batchDocument.partitionKey);
        }
    }

    private async writeRequestsToPermanentContainer(requests: ScanRunBatchRequest[]): Promise<void> {
        const requestDocuments = requests.map<OnDemandPageScanResult>(request => {
            return {
                id: request.scanId,
                url: request.url,
                priority: 0,
                itemType: ItemType.onDemandPageScanRunResult,
                partitionKey: this.getPartitionKey(request.scanId),
                run: {
                    state: 'accepted',
                    timestamp: new Date().toJSON(),
                },
            };
        });

        await this.onDemandPageScanRunResultProvider.writeScanRuns(requestDocuments);
    }

    private async writeRequestsToQueueContainer(requests: ScanRunBatchRequest[]): Promise<void> {
        const requestDocuments = requests.map<OnDemandPageScanRequest>(request => {
            return {
                id: request.scanId,
                url: request.url,
                priority: 0,
                itemType: ItemType.onDemandPageScanRequest,
                partitionKey: PartitionKey.pageScanRequestDocuments,
            };
        });

        await this.pageScanRequestProvider.insertRequests(requestDocuments);
    }

    private validateRequestData(documents: OnDemandPageScanBatchRequest[]): boolean {
        if (documents === undefined || documents.length === 0 || !documents.some(d => d.itemType === ItemType.scanRunBatchRequest)) {
            return false;
        }

        return true;
    }

    private getPartitionKey(scanId: string): string {
        const node = this.guidGenerator.getGuidNode(scanId);

        return this.hashGenerator.getDbHashBucket(OnDemandPageScanRunResultProvider.partitionKeyPreFix, node);
    }
}
