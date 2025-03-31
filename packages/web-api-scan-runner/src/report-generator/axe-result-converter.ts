// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ReportFormat, ReportSource } from 'storage-documents';
import { AxeScanResults } from 'scanner-global-library';

export interface AxeResultConverter {
    readonly targetReportFormat: ReportFormat;
    readonly targetReportSource: ReportSource[];
    convert(axeScanResults: AxeScanResults): string;
}
