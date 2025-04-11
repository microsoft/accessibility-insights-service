// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { ReportResult } from 'scanner-global-library';
import { GeneratedReport } from 'service-library';
import { isEmpty } from 'lodash';
import { AxeResults } from 'axe-core';
import { iocTypeNames } from '../ioc-types';
import { AxeResultConverter } from './axe-result-converter';

@injectable()
export class ReportGenerator {
    constructor(
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(iocTypeNames.AxeResultConverters) private readonly axeResultConverters: AxeResultConverter[],
    ) {}

    /**
     * The first parameter is used as the base to merge the results of the other parameters.
     */
    public generateReports(...reportResults: ReportResult[]): GeneratedReport[] {
        const accessibilityReports = this.generateAccessibilityReports(reportResults);
        accessibilityReports.push(...this.generateAgentReports(reportResults));
        accessibilityReports.push(...this.generateAccessibilityCombinedReports(reportResults));

        return accessibilityReports;
    }

    private generateAccessibilityReports(reportResults: ReportResult[]): GeneratedReport[] {
        const reportSource = 'accessibility-scan';
        const reportResult = reportResults.find((r) => r.reportSource === reportSource);
        if (reportResult === undefined) {
            return [];
        }

        return (
            this.axeResultConverters
                // Filter out the converters that are not applicable to the current axeScanResults
                .filter((axeResultConverter) => axeResultConverter.targetReportSource.includes(reportSource))
                .map<GeneratedReport>((axeResultConverter) => {
                    return {
                        content: axeResultConverter.convert(reportResult),
                        id: this.guidGenerator.createGuid(),
                        format: axeResultConverter.targetReportFormat,
                        source: reportSource,
                    };
                })
        );
    }

    private generateAgentReports(reportResults: ReportResult[]): GeneratedReport[] {
        const reportSource = 'accessibility-agent';
        const reportResult = reportResults.find((r) => r.reportSource === reportSource);
        if (reportResult === undefined) {
            return [];
        }

        return (
            this.axeResultConverters
                // Filter out the converters that are not applicable to the current axeScanResults
                .filter((axeResultConverter) => axeResultConverter.targetReportSource.includes(reportSource))
                .map<GeneratedReport>((axeResultConverter) => {
                    return {
                        content: axeResultConverter.convert(reportResult),
                        id: this.guidGenerator.createGuid(),
                        format: axeResultConverter.targetReportFormat,
                        source: reportSource,
                    };
                })
        );
    }

    private generateAccessibilityCombinedReports(reportResults: ReportResult[]): GeneratedReport[] {
        const reportSource = 'accessibility-combined';

        // If there is only one report, we don't need to merge the results
        if (reportResults.length === 1) {
            return [];
        }

        // Merge the axe scan results from all the reports
        const baseAxeScanResult = reportResults[0];
        const mergedAxeResults = this.mergeAxeScanResults(
            reportResults
                .filter(
                    // Filter out the reports that are not applicable to the current axeScanResults
                    (r) => isEmpty(r) === false && (r.reportSource === 'accessibility-scan' || r.reportSource === 'accessibility-agent'),
                )
                .map((r) => r.axeResults),
        );
        baseAxeScanResult.axeResults.violations = mergedAxeResults.violations;
        baseAxeScanResult.axeResults.passes = mergedAxeResults.passes;
        baseAxeScanResult.axeResults.inapplicable = mergedAxeResults.inapplicable;
        baseAxeScanResult.axeResults.incomplete = mergedAxeResults.incomplete;

        return (
            this.axeResultConverters
                // Filter out the converters that are not applicable to the current axeScanResults
                .filter((axeResultConverter) => axeResultConverter.targetReportSource.includes(reportSource))
                .map<GeneratedReport>((axeResultConverter) => {
                    return {
                        content: axeResultConverter.convert(baseAxeScanResult),
                        id: this.guidGenerator.createGuid(),
                        format: axeResultConverter.targetReportFormat,
                        source: reportSource,
                    };
                })
        );
    }

    private mergeAxeScanResults(axeScanResults: AxeResults[]): AxeResults {
        return axeScanResults
            .filter((r) => isEmpty(r) === false)
            .reduce((previous, current) => {
                return {
                    ...previous,
                    ...current,
                    violations: [...previous.violations, ...current.violations],
                    passes: [...previous.passes, ...current.passes],
                    inapplicable: [...previous.inapplicable, ...current.inapplicable],
                    incomplete: [...previous.incomplete, ...current.incomplete],
                };
            });
    }
}
