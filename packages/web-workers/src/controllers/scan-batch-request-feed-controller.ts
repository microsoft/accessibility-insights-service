// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ContextAwareLogger, ScanRequestAcceptedMeasurements } from 'logger';
import {
    OnDemandPageScanRunResultProvider,
    PageScanRequestProvider,
    PartitionKeyFactory,
    ScanDataProvider,
    WebController,
    WebsiteScanResultProvider,
} from 'service-library';
import {
    ItemType,
    OnDemandPageScanBatchRequest,
    OnDemandPageScanRequest,
    OnDemandPageScanResult,
    PartitionKey,
    ScanGroupType,
    ScanRunBatchRequest,
    WebsiteScanResult,
} from 'storage-documents';

@injectable()
export class ScanBatchRequestFeedController extends WebController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'scan-batch-request-feed';

    public constructor(
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(ScanDataProvider) private readonly scanDataProvider: ScanDataProvider,
        @inject(WebsiteScanResultProvider) private readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(ContextAwareLogger) protected readonly logger: ContextAwareLogger,
    ) {
        super(logger);
    }

    public async handleRequest(...args: unknown[]): Promise<void> {
        this.logger.setCommonProperties({ source: 'scanBatchCosmosFeedTriggerFunc' });
        this.logger.logInfo('Processing the scan batch documents.');

        const batchDocuments = <OnDemandPageScanBatchRequest[]>args[0];
        await Promise.all(
            batchDocuments.map(async (document) => {
                const addedRequests = await this.processDocument(document);
                const scanRequestAcceptedMeasurements: ScanRequestAcceptedMeasurements = {
                    acceptedScanRequests: addedRequests,
                };
                this.logger.trackEvent('ScanRequestAccepted', { batchRequestId: document.id }, scanRequestAcceptedMeasurements);
                this.logger.logInfo(`The batch request document processed successfully.`);
            }),
        );

        this.logger.logInfo('The scan batch documents processed successfully.');
    }

    protected validateRequest(...args: unknown[]): boolean {
        const batchDocuments = <OnDemandPageScanBatchRequest[]>args[0];

        return this.validateRequestData(batchDocuments);
    }

    private async processDocument(batchDocument: OnDemandPageScanBatchRequest): Promise<number> {
        const requests = batchDocument.scanRunBatchRequest.filter((request) => request.scanId !== undefined);
        if (requests.length > 0) {
            await this.writeRequestsToPermanentContainer(requests, batchDocument.id);
            await this.writeRequestsToQueueContainer(requests, batchDocument.id);

            await this.scanDataProvider.deleteBatchRequest(batchDocument);
            this.logger.logInfo(`Completed deleting batch requests from inbound storage container.`);
        }

        return requests.length;
    }

    private async writeRequestsToPermanentContainer(requests: ScanRunBatchRequest[], batchRequestId: string): Promise<void> {
        const websiteScanResults: { scanId: string; websiteScanResult: WebsiteScanResult }[] = [];
        const requestDocuments = requests.map<OnDemandPageScanResult>((request) => {
            this.logger.logInfo('Created new scan result document in scan result storage container.', {
                batchRequestId,
                scanId: request.scanId,
            });

            const websiteScanResult = this.createWebsiteScanResult(request);
            const websiteScanRef = {
                id: websiteScanResult.id,
                scanGroupId: websiteScanResult.scanGroupId,
                scanGroupType: websiteScanResult.scanGroupType,
            };
            websiteScanResults.push({ scanId: request.scanId, websiteScanResult });
            this.logger.logInfo('Referenced website scan result document to the new scan result document.', {
                batchRequestId,
                scanId: request.scanId,
                websiteScanId: websiteScanResult.id,
                scanGroupId: websiteScanResult.scanGroupId,
                scanGroupType: websiteScanResult.scanGroupType,
            });

            return {
                id: request.scanId,
                url: request.url,
                priority: request.priority,
                itemType: ItemType.onDemandPageScanRunResult,
                batchRequestId: batchRequestId,
                // We use scan id from the original scan request. The original scan id is propagated to descendant requests.
                deepScanId: request.deepScanId ?? request.scanId,
                partitionKey: this.partitionKeyFactory.createPartitionKeyForDocument(ItemType.onDemandPageScanRunResult, request.scanId),
                websiteScanRef,
                ...(request.authenticationType === undefined ? {} : { authentication: { hint: request.authenticationType } }),
                run: {
                    state: 'accepted',
                    timestamp: new Date().toJSON(),
                },
                ...(isEmpty(request.scanNotifyUrl)
                    ? {}
                    : {
                          notification: {
                              state: 'pending',
                              scanNotifyUrl: request.scanNotifyUrl,
                          },
                      }),
                ...(request.privacyScan === undefined ? {} : { privacyScan: request.privacyScan }),
            };
        });

        if (websiteScanResults.length > 0) {
            await this.websiteScanResultProvider.mergeOrCreateBatch(websiteScanResults);
        }

        await this.onDemandPageScanRunResultProvider.writeScanRuns(requestDocuments);
        this.logger.logInfo(`Completed adding scan requests to permanent scan result storage container.`);
    }

    private createWebsiteScanResult(request: ScanRunBatchRequest): WebsiteScanResult {
        let consolidatedGroup;
        if (request.reportGroups !== undefined) {
            consolidatedGroup = request.reportGroups.find((g) => g.consolidatedId !== undefined);
        }

        let scanGroupType: ScanGroupType;
        if (request.deepScan === true) {
            scanGroupType = 'deep-scan';
        } else if (consolidatedGroup?.consolidatedId || request.site?.knownPages?.length > 0) {
            scanGroupType = 'consolidated-scan';
        } else {
            scanGroupType = 'single-scan';
        }

        const websiteScanRequest: Partial<WebsiteScanResult> = {
            baseUrl: request.site?.baseUrl,
            scanGroupId: consolidatedGroup?.consolidatedId ?? this.guidGenerator.createGuid(),
            scanGroupType,
            // This value is immutable and set on new db document creation.
            deepScanId: request.scanId,
            pageScans: [
                {
                    scanId: request.scanId,
                    url: request.url,
                    timestamp: new Date().toJSON(),
                },
            ],
            knownPages: request.site?.knownPages,
            discoveryPatterns: request.site?.discoveryPatterns?.length > 0 ? request.site.discoveryPatterns : undefined,
            // `created` value is set only when db document is created
            created: new Date().toJSON(),
        };

        return this.websiteScanResultProvider.normalizeToDbDocument(websiteScanRequest);
    }

    private async writeRequestsToQueueContainer(requests: ScanRunBatchRequest[], batchRequestId: string): Promise<void> {
        const requestDocuments = requests.map<OnDemandPageScanRequest>((request) => {
            const scanNotifyUrl = isEmpty(request.scanNotifyUrl) ? {} : { scanNotifyUrl: request.scanNotifyUrl };
            this.logger.logInfo('Created new scan request document in queue storage container.', {
                batchRequestId,
                scanId: request.scanId,
            });

            return {
                id: request.scanId,
                url: request.url,
                priority: request.priority,
                deepScan: request.deepScan,
                // We use scan id from the original scan request. The original scan id is propagated to descendant requests.
                deepScanId: request.deepScanId ?? request.scanId,
                itemType: ItemType.onDemandPageScanRequest,
                partitionKey: PartitionKey.pageScanRequestDocuments,
                ...(isEmpty(request.reportGroups) ? {} : { reportGroups: request.reportGroups }),
                ...(request.privacyScan === undefined ? {} : { privacyScan: request.privacyScan }),
                ...(request.authenticationType === undefined ? {} : { authenticationType: request.authenticationType }),
                ...scanNotifyUrl,
                ...(isEmpty(request.site) ? {} : { site: request.site }),
            };
        });

        await this.pageScanRequestProvider.insertRequests(requestDocuments);
        this.logger.logInfo(`Completed adding scan requests to scan queue storage container.`);
    }

    private validateRequestData(documents: OnDemandPageScanBatchRequest[]): boolean {
        if (documents === undefined || documents.length === 0 || !documents.some((d) => d.itemType === ItemType.scanRunBatchRequest)) {
            this.logger.logWarn(`The scan batch documents were malformed.`, { documents: JSON.stringify(documents) });

            return false;
        }

        return true;
    }
}
