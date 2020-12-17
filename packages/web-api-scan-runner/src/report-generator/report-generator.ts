// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { AxeScanResults } from 'scanner-global-library';
import { ReportFormat, CombinedScanResults } from 'storage-documents';
import { iocTypeNames } from '../ioc-types';
import { AxeResultConverter, AxeResultConverterOptions } from './axe-result-converter';
import { AxeResultToConsolidatedHtmlConverter } from './axe-result-to-consolidated-html-converter';

export type GeneratedReport = {
    content: string;
    id: string;
    format: ReportFormat;
};

@injectable()
export class ReportGenerator {
    constructor(
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(iocTypeNames.AxeResultConverters) private readonly axeResultConverters: AxeResultConverter[],
        @inject(AxeResultToConsolidatedHtmlConverter) private readonly combinedAxeResultConverter: AxeResultToConsolidatedHtmlConverter,
    ) {}

    public generateReports(axeResults: AxeScanResults): GeneratedReport[] {
        const options = {
            pageTitle: axeResults.pageTitle,
        } as AxeResultConverterOptions;

        return this.axeResultConverters.map<GeneratedReport>((axeResultConverter) => {
            return {
                content: axeResultConverter.convert(axeResults.results, options),
                id: this.guidGenerator.createGuid(),
                format: axeResultConverter.targetReportFormat,
            };
        });
    }

    public generateConsolidatedReport(combinedScanResults: CombinedScanResults, options: AxeResultConverterOptions): GeneratedReport {
        return {
            content: this.combinedAxeResultConverter.convert(combinedScanResults, options),
            id: options.reportId,
            format: this.combinedAxeResultConverter.targetReportFormat,
        };
    }
}
