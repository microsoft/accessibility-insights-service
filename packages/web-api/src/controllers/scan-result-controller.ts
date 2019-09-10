// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context } from '@azure/functions';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';

import { ScanDataProvider } from '../providers/scan-data-provider';
import { webApiIocTypes } from '../setup-ioc-container';
import { ApiController } from './api-controller';

@injectable()
export class ScanRequestController extends ApiController {
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

        const scanResultQueryBufferInSeconds = (await this.serviceConfig.getConfigValue('restApiConfig')).maxScanRequestBatchCount;

        const response = await this.scanDataProvider.readScanResult();
        this.context.res = {
            status: 200, // OK
            body: response,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        this.logger.logInfo('Accepted scan run batch request');
    }
}
