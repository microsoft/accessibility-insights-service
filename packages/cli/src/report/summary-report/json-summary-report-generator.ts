// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { SummaryReportData } from './summary-report-data';
import { SummaryReportGenerator } from './summary-report-generator';

@injectable()
export class JsonSummaryReportGenerator implements SummaryReportGenerator {
    public generateReport(summaryReportData: SummaryReportData): string {
        return JSON.stringify(summaryReportData.violationCountByRuleMap);
    }
}
