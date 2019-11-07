// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ContextAwareLogger } from 'logger';
import { OnDemandPageScanRunResultProvider, ScanBatchRequest, ScanResultResponse, WebApiErrorCodes } from 'service-library';

import { ScanResponseConverter } from '../converters/scan-response-converter';
import { BaseScanResultController } from './base-scan-result-controller';

@injectable()
export class BatchScanResultController extends BaseScanResultController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'wep-api-get-scans';

    public constructor(
        @inject(OnDemandPageScanRunResultProvider) protected readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(ScanResponseConverter) protected readonly scanResponseConverter: ScanResponseConverter,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) contextAwareLogger: ContextAwareLogger,
    ) {
        super(contextAwareLogger);
    }

    public async handleRequest(): Promise<void> {
        const payload = this.tryGetPayload<ScanBatchRequest[]>();
        const scanIds = payload.map(request => request.scanId);
        const responseBody: ScanResultResponse[] = [];
        const scanIdsToQuery: string[] = [];

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
                scanIdsToQuery.push(scanId);
            }
        }

        const scanResultItemMap = await this.getScanResultMapKeyByScanId(scanIdsToQuery);
        scanIdsToQuery.forEach(scanId => {
            if (isEmpty(scanResultItemMap[scanId])) {
                responseBody.push({
                    scanId: scanId,
                    error: WebApiErrorCodes.resourceNotFound.error,
                });
            } else {
                responseBody.push(this.getScanResultResponse(scanResultItemMap[scanId]));
            }
        });

        this.context.res = {
            status: 200,
            body: responseBody,
        };

        this.contextAwareLogger.logInfo('Batch scan result fetched.', { scanIds: JSON.stringify(scanIdsToQuery) });
    }
}
