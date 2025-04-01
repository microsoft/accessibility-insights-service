// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ReportFormat, ReportSource } from 'storage-documents';
import { ReportResult } from 'scanner-global-library';

export interface AxeResultConverter {
    readonly targetReportFormat: ReportFormat;
    readonly targetReportSource: ReportSource[];
    convert(reportResult: ReportResult): string;
}
