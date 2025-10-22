// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { GlobalLogger } from 'logger';
import { WebHttpResponse, OnDemandPageScanRunResultProvider, WebApiErrorCodes, WebsiteScanDataProvider } from 'service-library';
import { HttpResponseInit } from '@azure/functions';
import { ScanResponseConverter } from '../converters/scan-response-converter';
import { BaseScanResultController } from './base-scan-result-controller';

@injectable()
export class ScanResultController extends BaseScanResultController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'web-api-get-scan';

    public constructor(
        @inject(OnDemandPageScanRunResultProvider) protected readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(WebsiteScanDataProvider) protected readonly websiteScanDataProvider: WebsiteScanDataProvider,
        @inject(ScanResponseConverter) protected readonly scanResponseConverter: ScanResponseConverter,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) protected readonly logger: GlobalLogger,
    ) {
        super(logger);
    }

    public async handleRequest(): Promise<HttpResponseInit> {
        const scanId = this.appContext.request.params.scanId;
        this.logger.setCommonProperties({ source: 'getScanResultRESTApi', scanId });

        if (!this.isScanIdValid(scanId)) {
            this.logger.logError('The client request scan id is malformed.');

            return WebHttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId);
        }

        const scanResultItemMap = await this.getScanResultMapKeyByScanId([scanId]);
        const pageScanResult = scanResultItemMap[scanId];

        if (isEmpty(pageScanResult)) {
            // scan result was not found in result storage
            if (await this.isRequestMadeTooSoon(scanId)) {
                // user made the scan result query too soon after the scan request, will return a default pending response.
                this.logger.logWarn('Scan result is not ready in a storage.');

                return {
                    status: 200,
                    jsonBody: this.getTooSoonRequestResponse(scanId),
                };
            } else {
                // return scan was not found response
                this.logger.logError('Scan result was not found in a storage.');

                return WebHttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound);
            }
        } else {
            const websiteScanData = await this.getWebsiteScanData(pageScanResult);
            const jsonBody = await this.getScanResultResponse(pageScanResult, websiteScanData);
            this.logger.logInfo('Scan result was successfully fetched from a storage.');

            return {
                status: 200,
                jsonBody,
            };
        }
    }
}
