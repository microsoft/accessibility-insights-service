// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { CombinedReportParameters } from 'accessibility-insights-report';
import { CombinedReportDataConverter } from './combined-report-data-converter';
import { AxeCoreResults } from './axe-result-types';
import { ScanResultData } from './scan-result-data';

@injectable()
export class AICombinedReportDataConverter {
    constructor(@inject(CombinedReportDataConverter) private readonly combinedReportDataConverter: CombinedReportDataConverter) {}

    public convertCrawlingResults(combinedAxeResults: AxeCoreResults, scanResultData: ScanResultData): CombinedReportParameters {
        return this.combinedReportDataConverter.convert(combinedAxeResults, scanResultData);
    }
}
