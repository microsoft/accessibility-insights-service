// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { ApiController, PageScanRunReportService } from 'service-library';

@injectable()
export class ScanReportController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-get-report';

    public constructor(
        @inject(PageScanRunReportService) private readonly pageScanRunReportService: PageScanRunReportService,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) private readonly logger: Logger,
    ) {
        super();
    }

    public async handleRequest(): Promise<void> {
        const scanId = <string>this.context.bindingData.scanId;

        const blobContentDownloadResponse = await this.pageScanRunReportService.readSarifReport(scanId);

        if (blobContentDownloadResponse.notFound === true) {
            this.context.res = {
                status: 404,
            };

            return;
        }

        this.context.res = {
            status: 404,
            body: blobContentDownloadResponse.content,
        };

        this.logger.logInfo('Report fetched', { scanId });
    }
}
