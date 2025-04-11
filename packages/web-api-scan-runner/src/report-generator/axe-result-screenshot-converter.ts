// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { ReportFormat, ReportSource } from 'storage-documents';
import { ReportResult } from 'scanner-global-library';
import { AxeResultConverter } from './axe-result-converter';

@injectable()
export class AxeResultScreenshotConverter implements AxeResultConverter {
    public readonly targetReportFormat: ReportFormat = 'page.png';

    public readonly targetReportSource: ReportSource[] = ['accessibility-scan'];

    public convert(reportResult: ReportResult): string {
        return reportResult.pageScreenshot;
    }
}
