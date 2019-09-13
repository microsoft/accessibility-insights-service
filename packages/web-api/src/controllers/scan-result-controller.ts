// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { Logger } from 'logger';
import { OnDemandPageScanRunResultProvider } from 'service-library';

import { BaseScanResultController } from './base-scan-result-controller';

@injectable()
export class ScanResultController extends BaseScanResultController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-get-scan';

    public constructor(
        @inject(OnDemandPageScanRunResultProvider) protected readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) protected readonly logger: Logger,
    ) {
        super();
    }

    public async handleRequest(): Promise<void> {
        const scanId = <string>this.context.bindingData.scanId;
        if (!this.isScanIdValid(scanId)) {
            this.handleInvalidRequest(scanId);

            return;
        }

        const isRequestMadeTooSoon = await this.isRequestMadeTooSoon(scanId);

        if (isRequestMadeTooSoon === true) {
            // user made the scan result query too soon after the scan request, will return a default response.
            this.context.res = {
                status: 202, // Accepted
                body: this.getTooSoonRequestResponse(scanId),
            };
            this.logger.logInfo('scan result queried too soon', { scanId });

            return;
        }

        const scanResultItemMap = await this.getScanResultMapKeyByScanId([scanId]);
        const scanResult = scanResultItemMap[scanId];

        if (isEmpty(scanResult)) {
            // scan result not found
            this.context.res = {
                status: 404,
                body: this.get404Response(scanId),
            };
            this.logger.logInfo('scan result not found', { scanId });
        } else {
            this.context.res = {
                status: 200,
                body: scanResult,
            };

            this.logger.logInfo('scan result fetched', { scanId });
        }
    }

    // tslint:disable-next-line: no-any
    protected handleInvalidRequest(scanId: string): void {
        this.context.res = {
            status: 422, // Unprocessable Entity,
            body: this.getInvalidRequestResponse(scanId),
        };
    }
}
