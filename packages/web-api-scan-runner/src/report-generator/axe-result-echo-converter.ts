// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { ReportFormat, ReportSource } from 'storage-documents';
import { ReportResult } from 'scanner-global-library';
import { AxeResultConverter } from './axe-result-converter';

@injectable()
export class AxeResultEchoConverter implements AxeResultConverter {
    public readonly targetReportFormat: ReportFormat = 'axe';

    public readonly targetReportSource: ReportSource[] = ['accessibility-scan', 'accessibility-agent', 'accessibility-combined'];

    public convert(reportResult: ReportResult): string {
        const report = {
            results: reportResult.axeResults,
            scannedUrl: reportResult.scannedUrl,
            pageTitle: reportResult.pageTitle,
            browserSpec: reportResult.browserSpec,
            userAgent: reportResult.userAgent,
            browserResolution: reportResult.browserResolution,
        };

        return JSON.stringify(report);
    }
}
