// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { cosmosContainerClientTypes, CosmosContainerClient } from 'azure-services';
import { System, HashGenerator, RetryHelper } from 'common';
import { WebsiteScanResult, ItemType } from 'storage-documents';
import { GlobalLogger } from 'logger';
import _ from 'lodash';
import moment from 'moment';
import { PartitionKeyFactory } from '../factories/partition-key-factory';

@injectable()
export class WebsiteScanResultProvider {
    private readonly maxRetryCount: number = 5;
    private readonly msecBetweenRetries: number = 1000;

    constructor(
        @inject(cosmosContainerClientTypes.OnDemandScanRunsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        @inject(HashGenerator) private readonly hashGenerator: HashGenerator,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(RetryHelper) private readonly retryHelper: RetryHelper<WebsiteScanResult> = new RetryHelper<WebsiteScanResult>(),
    ) {}

    public async read(websiteScanId: string): Promise<WebsiteScanResult> {
        return (await this.cosmosContainerClient.readDocument<WebsiteScanResult>(websiteScanId, this.getPartitionKey(websiteScanId))).item;
    }

    /**
     * Writes documents to a storage if documents do not exist; otherwise, merges documents with corresponding storage documents.
     *
     * Source document properties that resolve to undefined are skipped if a destination document value exists.
     * Will remove all falsey (false, null, 0, "", undefined, and NaN) values from document's array type properties
     */
    public async mergeOrCreateBatch(websiteScanResults: Partial<WebsiteScanResult>[]): Promise<WebsiteScanResult[]> {
        const sourceDocuments = websiteScanResults.map((scanResult) => this.normalizeToDbDocument(scanResult));
        const scanResultsById = _.groupBy(sourceDocuments, (scanResult) => scanResult.id);
        const response = await Promise.all(
            Object.keys(scanResultsById).map(async (id) => {
                // merge same id documents in memory
                const mergedDocument = this.mergeBatch(scanResultsById[id]);

                return this.mergeOrCreate(mergedDocument);
            }),
        );

        return response;
    }

    /**
     * Writes document to a storage if document does not exist; otherwise, merges the document with the current storage document.
     *
     * Source document properties that resolve to undefined are skipped if a destination document value exists.
     * Will remove all falsey (false, null, 0, "", undefined, and NaN) values from document's array type properties
     */
    public async mergeOrCreate(websiteScanResult: Partial<WebsiteScanResult>): Promise<WebsiteScanResult> {
        const scanResultNormalized = this.normalizeToDbDocument(websiteScanResult);

        return (await this.retryHelper.executeWithRetries(
            async () => {
                const operationResult = await this.createIfNotExists(scanResultNormalized);
                if (operationResult.created) {
                    return operationResult.scanResult;
                } else {
                    return this.mergeAndWrite(operationResult.scanResult, websiteScanResult);
                }
            },
            async (err) =>
                this.logger.logError(`Failed to update website scan result Cosmos DB document. Retrying on error.`, {
                    document: JSON.stringify(scanResultNormalized),
                    error: System.serializeError(err),
                }),
            this.maxRetryCount,
            this.msecBetweenRetries,
        )) as WebsiteScanResult;
    }

    public normalizeToDbDocument(websiteScanResult: Partial<WebsiteScanResult>): WebsiteScanResult {
        const documentId = this.getWebsiteScanId(websiteScanResult);
        const partitionKey = websiteScanResult.partitionKey ?? this.getPartitionKey(documentId);

        return {
            ...(websiteScanResult as WebsiteScanResult),
            id: documentId,
            partitionKey: partitionKey,
            itemType: ItemType.websiteScanResult,
        };
    }

    private async mergeAndWrite(
        storageDocument: WebsiteScanResult,
        websiteScanResult: Partial<WebsiteScanResult>,
    ): Promise<WebsiteScanResult> {
        const mergedDocument = this.merge(websiteScanResult, storageDocument);

        return (await this.cosmosContainerClient.writeDocument<WebsiteScanResult>(mergedDocument)).item;
    }

    private mergeBatch(sourceDocuments: WebsiteScanResult[]): WebsiteScanResult {
        if (sourceDocuments.length === 1) {
            return sourceDocuments[0];
        }

        let targetDocument: WebsiteScanResult = sourceDocuments[0];
        sourceDocuments.map((sourceDocument) => {
            targetDocument = this.merge(sourceDocument, targetDocument);
        });

        return targetDocument;
    }

    private merge(sourceDocument: Partial<WebsiteScanResult>, targetDocument: WebsiteScanResult): WebsiteScanResult {
        const mergedDocument = _.mergeWith(targetDocument, sourceDocument, (target, source, key) => {
            // Preserve the current _etag value
            if (key === '_etag') {
                return target;
            }

            // Preserve original deep scan request scan id
            if (key === 'deepScanId') {
                return target;
            }

            if (_.isArray(target)) {
                if (key !== 'pageScans' && key !== 'reports' && key !== 'knownPages' && key !== 'discoveryPatterns') {
                    throw new Error(`Merge of array type value '${key}' is not implemented.`);
                }

                return _.compact(target.concat(source));
            }

            return undefined;
        });

        if (mergedDocument.reports !== undefined) {
            mergedDocument.reports = _.uniqBy(mergedDocument.reports, (r) => r.reportId);
        }

        if (mergedDocument.knownPages !== undefined) {
            mergedDocument.knownPages = _.uniq(mergedDocument.knownPages);
        }

        if (mergedDocument.discoveryPatterns !== undefined) {
            mergedDocument.discoveryPatterns = _.uniq(mergedDocument.discoveryPatterns);
        }

        if (mergedDocument.pageScans !== undefined) {
            const pageScansByUrl = _.groupBy(mergedDocument.pageScans, (scan) => scan.url.toLocaleLowerCase());
            mergedDocument.pageScans = Object.keys(pageScansByUrl).map((url) => {
                return _.maxBy(pageScansByUrl[url], (scan) => moment.utc(scan.timestamp).valueOf());
            });
        }

        return mergedDocument;
    }

    private async createIfNotExists(
        websiteScanResult: Partial<WebsiteScanResult>,
    ): Promise<{ created: boolean; scanResult: WebsiteScanResult }> {
        const operationResponse = await this.cosmosContainerClient.readDocument<WebsiteScanResult>(
            websiteScanResult.id,
            websiteScanResult.partitionKey,
            false,
        );

        if (operationResponse.item !== undefined) {
            return { created: false, scanResult: operationResponse.item };
        }

        const scanResult = (await this.cosmosContainerClient.writeDocument<WebsiteScanResult>(websiteScanResult as WebsiteScanResult)).item;

        return { created: true, scanResult };
    }

    private getWebsiteScanId(websiteScanResult: Partial<WebsiteScanResult>): string {
        if (websiteScanResult.id !== undefined) {
            return websiteScanResult.id;
        }

        if (websiteScanResult.baseUrl === undefined && websiteScanResult.scanGroupId === undefined) {
            throw new Error(
                `WebsiteScanResult instance should have either id or baseUrl and scanGroupId properties defined. ${JSON.stringify(
                    websiteScanResult,
                )}`,
            );
        }

        return this.hashGenerator.getWebsiteScanResultDocumentId(websiteScanResult.baseUrl, websiteScanResult.scanGroupId);
    }

    private getPartitionKey(websiteScanId: string): string {
        return this.partitionKeyFactory.createPartitionKeyForDocument(ItemType.websiteScanResult, websiteScanId);
    }
}
