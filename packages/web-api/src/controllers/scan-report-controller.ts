// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { ApiController, HttpResponse, PageScanRunReportService, WebApiErrorCodes } from 'service-library';
import { Readable } from 'stream';
import { BodyParser } from './../utils/body-parser';

@injectable()
export class ScanReportController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-get-report';

    public constructor(
        @inject(PageScanRunReportService) private readonly pageScanRunReportService: PageScanRunReportService,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) logger: Logger,
        private readonly bodyParser: BodyParser = new BodyParser(),
    ) {
        super(logger);
    }

    public async handleRequest(): Promise<void> {
        const reportId = <string>this.context.bindingData.reportId;
        if (!this.guidGenerator.isValidV6Guid(reportId)) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId);

            return;
        }

        const blobContentDownloadResponse = await this.pageScanRunReportService.readReport(reportId);
        if (blobContentDownloadResponse.notFound === true) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound);

            return;
        }

        const content = await this.bodyParser.getRawBody(blobContentDownloadResponse.content as Readable);
        this.context.res = {
            status: 200, // OK
            body: content,
        };

        this.logger.logInfo('Report fetched from blob store.', { reportId });
    }
}
