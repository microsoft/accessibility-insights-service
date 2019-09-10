// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context } from '@azure/functions';
import { Guid, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';

import { ScanResultResponse } from '../api-contracts/scan-result-response';
import { ScanDataProvider } from '../providers/scan-data-provider';
import { webApiIocTypes } from '../setup-ioc-container';
import { ApiController } from './api-controller';

@injectable()
export class ScanResultController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'get-scan';

    public constructor(
        @inject(webApiIocTypes.azureFunctionContext) protected readonly context: Context,
        @inject(ScanDataProvider) private readonly scanDataProvider: ScanDataProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) protected readonly logger: Logger,
    ) {
        super();
    }

    public async handleRequest(): Promise<void> {
        const scanId = <string>this.context.bindingData.scanId;
        const timeRequested = Guid.getGuidTimestamp(scanId);
        const timeCurrent = new Date();
        const scanResultQueryBufferInSeconds = (await this.serviceConfig.getConfigValue('restApiConfig')).scanResultQueryBufferInSeconds;

        if (timeCurrent.getTime() - timeRequested.getTime() <= scanResultQueryBufferInSeconds * 1000) {
            const nullResponse: ScanResultResponse = {
                scanId,
                url: undefined,
                run: {
                    state: 'accepted',
                },
            };
            this.context.res = {
                status: 202, // Accepted
                body: nullResponse,
            };
            this.logger.logInfo('scan result queried too soon');

            return;
        }

        const scanResultItem = await this.scanDataProvider.readScanResult(scanId);

        this.context.res = {
            status: scanResultItem.statusCode,
            body: scanResultItem.item,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        this.logger.logInfo('scan result fetched');
    }
}
