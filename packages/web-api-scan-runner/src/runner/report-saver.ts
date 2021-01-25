// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { PageScanRunReportProvider } from 'service-library';
import { OnDemandPageScanReport } from 'storage-documents';
import { GeneratedReport } from '../report-generator/report-generator';

@injectable()
export class ReportSaver {
    public constructor(
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(PageScanRunReportProvider) private readonly pageScanRunReportProvider: PageScanRunReportProvider,
    ) {}

    public async save(report: GeneratedReport): Promise<OnDemandPageScanReport> {
        const href = await this.pageScanRunReportProvider.saveReport(report.id, report.content);
        this.logger.logInfo(`The '${report.format}' report saved to a blob storage.`, { reportId: report.id, blobUrl: href });

        return {
            format: report.format,
            href,
            reportId: report.id,
        };
    }
}
