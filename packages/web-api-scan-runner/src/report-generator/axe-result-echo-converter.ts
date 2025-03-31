// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { ReportFormat, ReportSource } from 'storage-documents';
import { AxeScanResults } from 'scanner-global-library';
import { AxeResultConverter } from './axe-result-converter';

@injectable()
export class AxeResultEchoConverter implements AxeResultConverter {
    public readonly targetReportFormat: ReportFormat = 'axe';

    public readonly targetReportSource: ReportSource[] = ['accessibility-scan', 'accessibility-combined'];

    public convert(axeScanResults: AxeScanResults): string {
        const report = {
            results: axeScanResults.results,
            scannedUrl: axeScanResults.scannedUrl,
            pageTitle: axeScanResults.pageTitle,
            browserSpec: axeScanResults.browserSpec,
            userAgent: axeScanResults.userAgent,
            browserResolution: axeScanResults.browserResolution,
        };

        return JSON.stringify(report);
    }
}
