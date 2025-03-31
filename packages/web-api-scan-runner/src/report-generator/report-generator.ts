// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { AxeScanResults } from 'scanner-global-library';
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
    public generateReports(...axeScanResults: AxeScanResults[]): GeneratedReport[] {
        const accessibilityReports = this.generateAccessibilityReports(axeScanResults[0]);

        if (axeScanResults.length > 1) {
            const accessibilityCombinedReport = this.generateAccessibilityCombinedReports(axeScanResults);
            accessibilityReports.push(...accessibilityCombinedReport);
        }

        return accessibilityReports;
    }

    private generateAccessibilityReports(axeScanResults: AxeScanResults): GeneratedReport[] {
        const source = 'accessibility-scan';

        return (
            this.axeResultConverters
                // Filter out the converters that are not applicable to the current axeScanResults
                .filter((axeResultConverter) => axeResultConverter.targetReportSource.includes(source))
                .map<GeneratedReport>((axeResultConverter) => {
                    return {
                        content: axeResultConverter.convert(axeScanResults),
                        id: this.guidGenerator.createGuid(),
                        format: axeResultConverter.targetReportFormat,
                        source,
                    };
                })
        );
    }

    private generateAccessibilityCombinedReports(axeScanResults: AxeScanResults[]): GeneratedReport[] {
        const source = 'accessibility-combined';

        const baseAxeScanResult = axeScanResults[0];
        const mergedAxeResults = this.mergeAxeScanResults(axeScanResults.filter((r) => isEmpty(r) === false).map((r) => r.results));
        baseAxeScanResult.results.violations = mergedAxeResults.violations;
        baseAxeScanResult.results.passes = mergedAxeResults.passes;
        baseAxeScanResult.results.inapplicable = mergedAxeResults.inapplicable;
        baseAxeScanResult.results.incomplete = mergedAxeResults.incomplete;

        return (
            this.axeResultConverters
                // Filter out the converters that are not applicable to the current axeScanResults
                .filter((axeResultConverter) => axeResultConverter.targetReportSource.includes(source))
                .map<GeneratedReport>((axeResultConverter) => {
                    return {
                        content: axeResultConverter.convert(baseAxeScanResult),
                        id: this.guidGenerator.createGuid(),
                        format: axeResultConverter.targetReportFormat,
                        source,
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
