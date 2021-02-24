// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty, Dictionary } from 'lodash';
import { ContextAwareLogger } from 'logger';
import {
    OnDemandPageScanRunResultProvider,
    ScanBatchRequest,
    ScanResultResponse,
    WebApiErrorCodes,
    WebsiteScanResultProvider,
} from 'service-library';
import { OnDemandPageScanResult } from 'storage-documents';
import { ScanResponseConverter } from '../converters/scan-response-converter';
import { BaseScanResultController } from './base-scan-result-controller';

@injectable()
export class BatchScanResultController extends BaseScanResultController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-get-scans';

    public constructor(
        @inject(OnDemandPageScanRunResultProvider) protected readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(WebsiteScanResultProvider) protected readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(ScanResponseConverter) protected readonly scanResponseConverter: ScanResponseConverter,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
    ) {
        super(logger);
    }

    public async handleRequest(): Promise<void> {
        this.logger.setCommonProperties({ source: 'getBatchScanResultRESTApi' });

        const payload = this.tryGetPayload<ScanBatchRequest[]>();
        const scanIds = payload.map((request) => request.scanId);
        const responseBody: ScanResultResponse[] = [];
        const scanIdsToQueryFromDb: string[] = [];

        for (const scanId of scanIds) {
            if (!this.isScanIdValid(scanId)) {
                responseBody.push({
                    scanId: scanId,
                    error: WebApiErrorCodes.invalidResourceId.error,
                });
                continue;
            }

            const isRequestMadeTooSoon = await this.isRequestMadeTooSoon(scanId);
            if (isRequestMadeTooSoon === true) {
                responseBody.push(this.getTooSoonRequestResponse(scanId));
            } else {
                scanIdsToQueryFromDb.push(scanId);
            }
        }

        const scanResultItemMap = await this.getScanResultMapKeyByScanId(scanIdsToQueryFromDb);
        const scanResponseBody = await this.getScanResponseBody(scanIdsToQueryFromDb, scanResultItemMap);
        responseBody.push(...scanResponseBody);

        this.context.res = {
            status: 200,
            body: responseBody,
        };

        this.logger.logInfo('Batch scan result successfully fetched.', { scanIds: JSON.stringify(scanIdsToQueryFromDb) });
    }

    private async getScanResponseBody(
        scanIds: string[],
        pageScanResults: Dictionary<OnDemandPageScanResult>,
    ): Promise<ScanResultResponse[]> {
        const responses: ScanResultResponse[] = [];

        await Promise.all(
            scanIds.map(async (scanId) => {
                const pageScanResult = pageScanResults[scanId];
                if (isEmpty(pageScanResult)) {
                    responses.push({
                        scanId: scanId,
                        error: WebApiErrorCodes.resourceNotFound.error,
                    });
                } else {
                    const websiteScanResult = await this.getWebsiteScanResult(pageScanResult);
                    responses.push(this.getScanResultResponse(pageScanResult, websiteScanResult));
                }
            }),
        );

        return responses;
    }
}
