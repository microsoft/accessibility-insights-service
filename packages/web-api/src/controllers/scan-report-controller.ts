// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Readable } from 'stream';
import { GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { ApiController, HttpResponse, PageScanRunReportService, WebApiErrorCodes } from 'service-library';
import { BodyParser } from './../utils/body-parser';

@injectable()
export class ScanReportController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-get-report';

    public constructor(
        @inject(PageScanRunReportService) private readonly pageScanRunReportService: PageScanRunReportService,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
        private readonly bodyParser: BodyParser = new BodyParser(),
    ) {
        super(logger);
    }

    public async handleRequest(): Promise<void> {
        const scanId = <string>this.context.bindingData.scanId;
        const reportId = <string>this.context.bindingData.reportId;
        this.logger.setCommonProperties({ source: 'getScanReportRESTApi', scanId, reportId });

        if (!this.guidGenerator.isValidV6Guid(reportId)) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId);
            this.logger.logError('The request report id is malformed.');

            return;
        }

        const blobContentDownloadResponse = await this.pageScanRunReportService.readReport(reportId);
        if (blobContentDownloadResponse.notFound === true) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound);
            this.logger.logError('The report is not found.');

            return;
        }

        const content = await this.bodyParser.getRawBody(blobContentDownloadResponse.content as Readable);
        this.context.res = {
            status: 200, // OK
            body: content,
        };

        this.logger.logInfo('The report successfully fetched from a blob store.');
    }
}
