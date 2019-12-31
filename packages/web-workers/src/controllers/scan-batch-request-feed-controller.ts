// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger, ScanUrlsAddedMeasurements } from 'logger';
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

interface ScanRequestTelemetryProperties {
    scanUrl: string;
    scanId: string;
}

interface BatchRequestFeedProcessTelemetryProperties {
    scanRequests: string;
    batchRequestId: string;
    [name: string]: string;
}

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
        @inject(Logger) logger: Logger,
    ) {
        super(logger);
    }

    public async handleRequest(...args: unknown[]): Promise<void> {
        this.logger.logInfo('processing the documents');

        const batchDocuments = <OnDemandPageScanBatchRequest[]>args[0];
        await Promise.all(
            batchDocuments.map(async document => {
                const addedRequests = await this.processDocument(document);
                const scanUrlsAddedMeasurements: ScanUrlsAddedMeasurements = {
                    addedUrls: addedRequests,
                };

                this.logger.trackEvent('ScanRequestsAccepted', { batchRequestId: document.id }, scanUrlsAddedMeasurements);

                this.logger.logInfo(
                    `[ScanBatchRequestFeedController] processed batch request document`,
                    this.getLogPropertiesForRequests(document.scanRunBatchRequest, document.id),
                );
            }),
        );
    }

    protected validateRequest(...args: unknown[]): boolean {
        const batchDocuments = <OnDemandPageScanBatchRequest[]>args[0];

        return this.validateRequestData(batchDocuments);
    }

    private async processDocument(batchDocument: OnDemandPageScanBatchRequest): Promise<number> {
        const requests = batchDocument.scanRunBatchRequest.filter(request => request.scanId !== undefined);
        if (requests.length > 0) {
            await this.writeRequestsToPermanentContainer(requests, batchDocument.id);
            await this.writeRequestsToQueueContainer(requests, batchDocument.id);
            await this.scanDataProvider.deleteBatchRequest(batchDocument);
            this.logger.logInfo(
                `[ScanBatchRequestFeedController] deleted batch request document ${batchDocument.id}`,
                this.getLogPropertiesForRequests(requests, batchDocument.id),
            );
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
        this.logger.logInfo(
            `[ScanBatchRequestFeedController] Added requests to permanent container`,
            this.getLogPropertiesForRequests(requests, batchRequestId),
        );
    }

    private async writeRequestsToQueueContainer(requests: ScanRunBatchRequest[], batchRequestId: string): Promise<void> {
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
        this.logger.logInfo(
            `[ScanBatchRequestFeedController] Added requests to queue container`,
            this.getLogPropertiesForRequests(requests, batchRequestId),
        );
    }

    private getLogPropertiesForRequests(
        requests: ScanRunBatchRequest[],
        batchRequestId: string,
    ): BatchRequestFeedProcessTelemetryProperties {
        return {
            scanRequests: JSON.stringify(
                requests.map(r => {
                    // tslint:disable-next-line: no-object-literal-type-assertion
                    return {
                        scanId: r.scanId,
                        scanUrl: r.url,
                    } as ScanRequestTelemetryProperties;
                }),
            ),
            batchRequestId,
        };
    }

    private validateRequestData(documents: OnDemandPageScanBatchRequest[]): boolean {
        if (documents === undefined || documents.length === 0 || !documents.some(d => d.itemType === ItemType.scanRunBatchRequest)) {
            this.logger.logInfo(`[ScanBatchRequestFeedController] passed documents were not valid - ${JSON.stringify(documents)}`);

            return false;
        }

        return true;
    }
}
