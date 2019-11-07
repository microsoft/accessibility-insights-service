// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger, ScanUrlsAddedMeasurements } from 'logger';
import {
    OnDemandPageScanRunResultProvider,
    PageScanRequestProvider,
    PartitionKeyFactory,
    ScanDataProvider,
    WebController,
} from 'service-library';
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
    public readonly apiVersion = '1.0';
    public readonly apiName = 'scan-batch-request-feed';

    public constructor(
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(ScanDataProvider) private readonly scanDataProvider: ScanDataProvider,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) contextAwareLogger: ContextAwareLogger,
    ) {
        super(contextAwareLogger);
    }

    public async handleRequest(...args: any[]): Promise<void> {
        this.contextAwareLogger.logInfo('processing the documents');

        const batchDocuments = <OnDemandPageScanBatchRequest[]>args[0];
        await Promise.all(
            batchDocuments.map(async document => {
                const addedRequests = await this.processDocument(document);
                const scanUrlsAddedMeasurements: ScanUrlsAddedMeasurements = {
                    addedUrls: addedRequests,
                };

                this.contextAwareLogger.trackEvent('ScanRequestsAccepted', { batchRequestId: document.id }, scanUrlsAddedMeasurements);
                this.contextAwareLogger.logInfo(`[ScanBatchRequestFeedController] processed batch request document with id ${document.id}`);
            }),
        );
    }

    protected validateRequest(...args: any[]): boolean {
        const batchDocuments = <OnDemandPageScanBatchRequest[]>args[0];

        return this.validateRequestData(batchDocuments);
    }

    private async processDocument(batchDocument: OnDemandPageScanBatchRequest): Promise<number> {
        const requests = batchDocument.scanRunBatchRequest.filter(request => request.scanId !== undefined);
        if (requests.length > 0) {
            await this.writeRequestsToPermanentContainer(requests, batchDocument.id);
            await this.writeRequestsToQueueContainer(requests);
            await this.scanDataProvider.deleteBatchRequest(batchDocument);
            this.contextAwareLogger.logInfo(`[ScanBatchRequestFeedController] deleted batch request document ${batchDocument.id}`);
        }

        return requests.length;
    }

    private async writeRequestsToPermanentContainer(requests: ScanRunBatchRequest[], batchRequestId: string): Promise<void> {
        const requestDocuments = requests.map<OnDemandPageScanResult>(request => {
            return {
                id: request.scanId,
                url: request.url,
                priority: request.priority,
                itemType: ItemType.onDemandPageScanRunResult,
                partitionKey: this.partitionKeyFactory.createPartitionKeyForDocument(ItemType.onDemandPageScanRunResult, request.scanId),
                run: {
                    state: 'accepted',
                    timestamp: new Date().toJSON(),
                },
                batchRequestId: batchRequestId,
            };
        });

        await this.onDemandPageScanRunResultProvider.writeScanRuns(requestDocuments);
    }

    private async writeRequestsToQueueContainer(requests: ScanRunBatchRequest[]): Promise<void> {
        const requestDocuments = requests.map<OnDemandPageScanRequest>(request => {
            return {
                id: request.scanId,
                url: request.url,
                priority: request.priority,
                itemType: ItemType.onDemandPageScanRequest,
                partitionKey: PartitionKey.pageScanRequestDocuments,
            };
        });

        await this.pageScanRequestProvider.insertRequests(requestDocuments);
    }

    private validateRequestData(documents: OnDemandPageScanBatchRequest[]): boolean {
        if (documents === undefined || documents.length === 0 || !documents.some(d => d.itemType === ItemType.scanRunBatchRequest)) {
            this.contextAwareLogger.logInfo(
                `[ScanBatchRequestFeedController] passed documents were not valid - ${JSON.stringify(documents)}`,
            );

            return false;
        }

        return true;
    }
}
