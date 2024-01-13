// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator, ServiceConfiguration, Url } from 'common';
import { inject, injectable } from 'inversify';
import { filter, groupBy, isEmpty, pullAllBy, uniqBy } from 'lodash';
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
    ReportGroupRequest,
    ScanGroupType,
    ScanRunBatchRequest,
    ScanType,
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
            batchDocuments.map(async (batchDocument) => {
                const addedRequests = await this.processDocument(batchDocument);
                const scanRequestAcceptedMeasurements: ScanRequestAcceptedMeasurements = {
                    acceptedScanRequests: addedRequests,
                };
                this.logger.trackEvent('ScanRequestAccepted', { batchRequestId: batchDocument.id }, scanRequestAcceptedMeasurements);
                this.logger.logInfo(`The batch request document processed successfully.`, { batchRequestId: batchDocument.id });
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
            requests.forEach((request) => this.normalizeRequest(request, batchDocument.id));
            await this.writeRequestsToPermanentContainer(requests, batchDocument.id);
            await this.writeRequestsToQueueContainer(requests, batchDocument.id);

            await this.scanDataProvider.deleteBatchRequest(batchDocument);
            this.logger.logInfo(`Completed deleting batch requests from inbound storage container.`, { batchRequestId: batchDocument.id });
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
                scanType: this.getScanType(request),
                itemType: ItemType.onDemandPageScanRunResult,
                batchRequestId: batchRequestId,
                // Deep scan id is the original scan request id. The deep scan id is propagated to descendant requests in scan request.
                deepScanId: websiteScanRef.scanGroupType !== 'single-scan' ? request.deepScanId ?? request.scanId : undefined,
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
        this.logger.logInfo(`Completed adding scan requests to permanent scan result storage container.`, { batchRequestId });
    }

    private createWebsiteScanResult(request: ScanRunBatchRequest): WebsiteScanResult {
        const consolidatedGroup = this.getReportGroupRequest(request);
        const scanGroupType = this.getScanGroupType(request);
        const websiteScanRequest: Partial<WebsiteScanResult> = {
            baseUrl: request.site?.baseUrl,
            scanGroupId: consolidatedGroup?.consolidatedId ?? this.guidGenerator.createGuid(),
            scanGroupType,
            // This value is immutable and set on new db document creation.
            deepScanId: scanGroupType !== 'single-scan' ? request.scanId : undefined,
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
            const scanGroupType = this.getScanGroupType(request);

            this.logger.logInfo('Created new scan request document in queue storage container.', {
                batchRequestId,
                scanId: request.scanId,
            });

            return {
                id: request.scanId,
                url: request.url,
                priority: request.priority,
                scanType: this.getScanType(request),
                deepScan: request.deepScan,
                // Deep scan id is the original scan request id. The deep scan id is propagated to descendant requests in scan request.
                deepScanId: scanGroupType !== 'single-scan' ? request.deepScanId ?? request.scanId : undefined,
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
        this.logger.logInfo(`Completed adding scan requests to scan queue storage container.`, { batchRequestId });
    }

    private getScanGroupType(request: ScanRunBatchRequest): ScanGroupType {
        const consolidatedGroup = this.getReportGroupRequest(request);
        if (request.deepScan === true) {
            return 'deep-scan';
        } else if (consolidatedGroup?.consolidatedId || request.site?.knownPages?.length > 0) {
            return 'consolidated-scan';
        } else {
            return 'single-scan';
        }
    }

    private getReportGroupRequest(request: ScanRunBatchRequest): ReportGroupRequest {
        if (request.reportGroups !== undefined) {
            return request.reportGroups.find((g) => g.consolidatedId !== undefined);
        }

        return undefined;
    }

    private validateRequestData(documents: OnDemandPageScanBatchRequest[]): boolean {
        if (documents === undefined || documents.length === 0 || !documents.some((d) => d.itemType === ItemType.scanRunBatchRequest)) {
            this.logger.logWarn(`The scan batch documents were malformed.`, { documents: JSON.stringify(documents) });

            return false;
        }

        return true;
    }

    private normalizeRequest(request: ScanRunBatchRequest, batchRequestId: string): void {
        // Normalize known pages
        if (request.site?.knownPages?.length > 0) {
            // Check for duplicate URLs in a client request
            const pages = [...request.site.knownPages, request.url];
            const duplicates = filter(
                groupBy(pages, (url) => Url.normalizeUrl(url)),
                (group) => group.length > 1,
            ).map((value) => value[0]);

            // Remove duplicate URLs from a client request
            if (duplicates.length > 0) {
                request.site.knownPages = pullAllBy(uniqBy(request.site.knownPages, Url.normalizeUrl), [request.url], Url.normalizeUrl);
                this.logger.logWarn('Removed duplicate URLs from a client request.', {
                    batchRequestId,
                    scanId: request.scanId,
                    duplicates: JSON.stringify(duplicates),
                });
            }
        }
    }

    private getScanType(request: ScanRunBatchRequest): ScanType {
        return request.scanType ?? (request.privacyScan ? 'privacy' : 'accessibility');
    }
}
