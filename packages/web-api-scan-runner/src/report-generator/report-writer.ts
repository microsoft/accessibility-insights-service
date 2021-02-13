// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { PageScanRunReportProvider } from 'service-library';
import { OnDemandPageScanReport } from 'storage-documents';
import { GeneratedReport } from './report-generator';

@injectable()
export class ReportWriter {
    public constructor(
        @inject(PageScanRunReportProvider) private readonly pageScanRunReportProvider: PageScanRunReportProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async writeBatch(reports: GeneratedReport[]): Promise<OnDemandPageScanReport[]> {
        return Promise.all(reports.map(async (report) => this.write(report)));
    }

    public async write(report: GeneratedReport): Promise<OnDemandPageScanReport> {
        const href = await this.pageScanRunReportProvider.saveReport(report.id, report.content);
        this.logger.logInfo(`The '${report.format}' report saved to a blob storage.`, { reportId: report.id, blobUrl: href });

        return {
            format: report.format,
            href,
            reportId: report.id,
        };
    }
}
