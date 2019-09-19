// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import * as getRawBody from 'raw-body';
import { ApiController, PageScanRunReportService } from 'service-library';
import { Readable } from 'stream';

@injectable()
export class ScanReportController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-get-report';

    public constructor(
        @inject(PageScanRunReportService) private readonly pageScanRunReportService: PageScanRunReportService,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) private readonly logger: Logger,
    ) {
        super();
    }

    public async handleRequest(): Promise<void> {
        const reportId = <string>this.context.bindingData.reportId;
        if (!this.guidGenerator.isValidV6Guid(reportId)) {
            this.context.res = {
                status: 422,
                body: `Invalid report id: ${reportId}.`,
            };

            return;
        }

        const blobContentDownloadResponse = await this.pageScanRunReportService.readSarifReport(reportId);

        if (blobContentDownloadResponse.notFound === true) {
            this.context.res = {
                status: 404,
            };

            return;
        }

        const content = await getRawBody(blobContentDownloadResponse.content as Readable);

        this.context.res = {
            status: 200,
            body: content,
        };

        this.logger.logInfo('Report fetched', { reportId });
    }
}
