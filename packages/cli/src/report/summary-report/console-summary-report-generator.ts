// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import { table } from 'table';
import { SummaryReportData, ViolationCountMap } from './summary-report-data';
import { SummaryReportGenerator } from './summary-report-generator';

@injectable()
export class ConsoleSummaryReportGenerator implements SummaryReportGenerator {
    public generateReport(summaryReportData: SummaryReportData): string {
        return `\n\n${this.getSummaryMessage(summaryReportData.violationCountByRuleMap)}`;
    }

    private getSummaryMessage(violationCountByRuleMap: ViolationCountMap): string {
        if (Object.keys(violationCountByRuleMap).length === 0) {
            return 'Congratulations! No failed automated checks were found.';
        } else {
            return `Automated checks summary results: ${this.getSummaryTableString(violationCountByRuleMap)}`;
        }
    }

    private getSummaryTableString(violationCountByRuleMap: ViolationCountMap): string {
        const tableInput: string[][] = [];

        tableInput.push(['Failed Rule', 'Count']);

        for (const key of Object.keys(violationCountByRuleMap)) {
            tableInput.push([key, `${violationCountByRuleMap[key]}`]);
        }

        return `\n${table(tableInput)}\n`;
    }
}
