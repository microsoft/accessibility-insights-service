// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SummaryReportData } from './summary-report-data';

export interface SummaryReportGenerator {
    generateReport(summaryReportData: SummaryReportData): string;
}
