// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { ReportFormat, ReportSource } from 'storage-documents';
import { AxeScanResults } from 'scanner-global-library';
import { AxeResultConverter } from './axe-result-converter';

@injectable()
export class AxeResultSnapshotConverter implements AxeResultConverter {
    public readonly targetReportFormat: ReportFormat = 'page.mhtml';

    public readonly targetReportSource: ReportSource[] = ['accessibility-scan'];

    public convert(axeScanResults: AxeScanResults): string {
        return axeScanResults.pageSnapshot;
    }
}
