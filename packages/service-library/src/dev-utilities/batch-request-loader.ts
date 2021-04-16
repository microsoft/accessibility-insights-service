// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable security/detect-non-literal-fs-filename */

import fs from 'fs';
import { injectable, inject } from 'inversify';
import { GuidGenerator, System } from 'common';
import { ScanRunBatchRequest } from 'storage-documents';
import pLimit from 'p-limit';
import { ScanDataProvider } from '../data-providers/scan-data-provider';
import { OnDemandPageScanRunResultProvider } from '../data-providers/on-demand-page-scan-run-result-provider';

interface BatchRequestLog {
    batchId: string;
    consolidatedId: string;
    scanIds: string[];
}

@injectable()
export class BatchRequestLoader {
    private readonly baseUrl = 'https://accessibilityinsights.io/';
    private readonly maxConcurrencyLimit = 10;
    private readonly defaultBatchLogFilePath = `${__dirname}/../../batchLog.json`;

    constructor(
        @inject(ScanDataProvider) private readonly scanDataProvider: ScanDataProvider,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
    ) {}

    public async generate(batchSize: number, batchCount: number, batchLogFilePath: string = this.defaultBatchLogFilePath): Promise<void> {
        const batchRequestLogs: BatchRequestLog[] = [];

        const urls = this.generateUrls(batchSize);
        let count = 0;
        do {
            const batchId = this.guidGenerator.createGuid();
            const consolidatedId = this.guidGenerator.createGuid();
            const batchRequest = this.createScanRequests(batchId, urls, consolidatedId);
            batchRequestLogs.push({
                batchId,
                consolidatedId,
                scanIds: batchRequest.map((scan) => scan.scanId),
            });
            await this.scanDataProvider.writeScanRunBatchRequest(batchId, batchRequest);

            count++;
            console.log(`[BatchRequestLoader][${new Date().toJSON()}] Generated batch #${count} with id ${batchId}`);
        } while (count < batchCount);

        fs.writeFileSync(batchLogFilePath, JSON.stringify(batchRequestLogs));

        console.log(`[BatchRequestLoader][${new Date().toJSON()}] Completed generating batch requests.`);
    }

    public async validate(batchLogFilePath: string = this.defaultBatchLogFilePath): Promise<void> {
        const batchLogFileContent = fs.readFileSync(batchLogFilePath, 'utf8');
        const batchRequestLogs = JSON.parse(batchLogFileContent) as BatchRequestLog[];
        const limit = pLimit(this.maxConcurrencyLimit);
        await Promise.all(
            batchRequestLogs.map(async (batchRequestLog) => {
                await Promise.all(
                    batchRequestLog.scanIds.map(async (scanId) => {
                        return limit(async () => {
                            try {
                                const scanResult = await this.onDemandPageScanRunResultProvider.readScanRun(scanId);
                                if (scanResult?.id === undefined) {
                                    console.log(`[BatchRequestLoader][${new Date().toJSON()}] Scan not found ${scanId}`);
                                }
                            } catch (error) {
                                console.log(
                                    `[BatchRequestLoader][${new Date().toJSON()}] Fail validate scan id ${scanId}. ${System.serializeError(
                                        error,
                                    )}`,
                                );
                            }
                        });
                    }),
                );

                console.log(`[BatchRequestLoader][${new Date().toJSON()}] Validated batch with id ${batchRequestLog.batchId}`);
            }),
        );

        console.log(`[BatchRequestLoader][${new Date().toJSON()}] Completed scan result documents validation.`);
    }

    private createScanRequests(batchId: string, urls: string[], consolidatedId: string): ScanRunBatchRequest[] {
        return urls.map((url) => {
            // preserve GUID origin for a single batch scope
            const scanId = this.guidGenerator.createGuidFromBaseGuid(batchId);

            return {
                scanId,
                url,
                priority: 1,
                deepScan: true,
                site: {
                    baseUrl: this.baseUrl,
                },
                reportGroups: [
                    {
                        consolidatedId,
                    },
                ],
            };
        });
    }

    private generateUrls(batchSize: number): string[] {
        const urls: string[] = [];
        for (let i = 1; i <= batchSize; i++) {
            urls.push(`${this.baseUrl}page${i}`);
        }

        return urls;
    }
}
