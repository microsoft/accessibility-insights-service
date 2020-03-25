// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { Logger } from 'logger';
import { HttpResponse, OnDemandPageScanRunResultProvider, WebApiErrorCodes } from 'service-library';
import { ScanResponseConverter } from '../converters/scan-response-converter';
import { BaseScanResultController } from './base-scan-result-controller';

@injectable()
export class ScanResultController extends BaseScanResultController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-get-scan';

    public constructor(
        @inject(OnDemandPageScanRunResultProvider) protected readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(ScanResponseConverter) protected readonly scanResponseConverter: ScanResponseConverter,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) logger: Logger,
    ) {
        super(logger);
    }

    public async handleRequest(): Promise<void> {
        const scanId = <string>this.context.bindingData.scanId;
        if (!this.isScanIdValid(scanId)) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId);

            return;
        }

        const scanResultItemMap = await this.getScanResultMapKeyByScanId([scanId]);
        const scanResult = scanResultItemMap[scanId];

        if (isEmpty(scanResult)) {
            // scan result not found in result storage
            if (await this.isRequestMadeTooSoon(scanId)) {
                // user made the scan result query too soon after the scan request, will return a default pending response.
                this.context.res = {
                    status: 200,
                    body: this.getTooSoonRequestResponse(scanId),
                };
                this.logger.logInfo('Scan result not found in result storage.', { scanId });
            } else {
                // return scan not found response
                this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound);
            }
        } else {
            this.context.res = {
                status: 200,
                body: this.getScanResultResponse(scanResult),
            };
            this.logger.logInfo('Scan result fetched from result storage.', { scanId });
        }
    }
}
