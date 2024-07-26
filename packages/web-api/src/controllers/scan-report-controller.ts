// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Readable } from 'stream';
import { GuidGenerator, ServiceConfiguration, BodyParser } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { ApiController, WebHttpResponse, PageScanRunReportProvider, WebApiErrorCodes } from 'service-library';
import { HttpResponseInit } from '@azure/functions';
import { isEmpty } from 'lodash';

@injectable()
export class ScanReportController extends ApiController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'web-api-get-report';

    public constructor(
        @inject(PageScanRunReportProvider) private readonly pageScanRunReportProvider: PageScanRunReportProvider,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) protected readonly logger: ContextAwareLogger,
        @inject(BodyParser) private readonly bodyParser: BodyParser,
    ) {
        super(logger);
    }

    public async handleRequest(): Promise<HttpResponseInit> {
        const scanId = this.appContext.request.query.get('scanId');
        const reportId = this.appContext.request.query.get('reportId');

        this.logger.setCommonProperties({ source: 'getScanReportRESTApi', scanId, reportId });

        if (isEmpty(reportId) || !this.guidGenerator.isValidV6Guid(reportId)) {
            this.logger.logError('The request report id is malformed.');

            return WebHttpResponse.getErrorResponse(WebApiErrorCodes.invalidResourceId);
        }

        const blobContentDownloadResponse = await this.pageScanRunReportProvider.readReport(reportId);
        if (blobContentDownloadResponse.notFound === true) {
            this.logger.logError('The report id is not found.');

            return WebHttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound);
        }

        const content = await this.bodyParser.getRawBody(blobContentDownloadResponse.content as Readable);
        this.logger.logInfo('The report was successfully fetched from a store.');

        return {
            status: 200,
            body: content,
        };
    }
}
