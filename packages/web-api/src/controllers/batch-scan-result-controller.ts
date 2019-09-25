// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { Logger } from 'logger';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import { ScanResultResponse } from './../api-contracts/scan-result-response';

import { ScanBatchRequest } from './../api-contracts/scan-batch-request';
import { BaseScanResultController } from './base-scan-result-controller';

@injectable()
export class BatchScanResultController extends BaseScanResultController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'wep-api-get-scans';

    public constructor(
        @inject(OnDemandPageScanRunResultProvider) protected readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) protected readonly logger: Logger,
    ) {
        super();
    }

    public async handleRequest(): Promise<void> {
        const payload = this.tryGetPayload<ScanBatchRequest[]>();
        if (isEmpty(payload)) {
            this.context.res = {
                status: 422, // Unprocessable Entity,
            };

            return;
        }

        const scanIds = payload.map(request => request.scanId);
        const responseBody: ScanResultResponse[] = [];
        const scanIdsToQuery: string[] = [];

        for (const scanId of scanIds) {
            if (!this.isScanIdValid(scanId)) {
                responseBody.push(this.getInvalidRequestResponse(scanId));
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
        for (const scanId of scanIdsToQuery) {
            if (isEmpty(scanResultItemMap[scanId])) {
                const isCosmosTriggerNotDone = await this.isCosmosTriggerNotDone(scanId);
                if (isCosmosTriggerNotDone) {
                    responseBody.push(this.getCosmosTriggerNotDoneResponse(scanId));
                } else {
                    responseBody.push(this.get404Response(scanId));
                }
            } else {
                responseBody.push(this.getResponseFromDbDocument(scanResultItemMap[scanId]));
            }
        }

        this.context.res = {
            status: 200,
            body: responseBody,
        };

        this.logger.logInfo('batch scan result fetched');
    }

    // tslint:disable-next-line: no-empty
    protected handleInvalidRequest(): void {}
}
