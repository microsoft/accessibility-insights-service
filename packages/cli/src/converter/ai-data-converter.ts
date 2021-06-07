// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { CombinedReportDataConverter, ScanResultData, AxeCoreResults } from 'axe-result-converter';
import { CombinedReportParameters } from 'accessibility-insights-report';

@injectable()
export class AICombinedReportDataConverter {
    constructor(@inject(CombinedReportDataConverter) private readonly combinedReportDataConverter: CombinedReportDataConverter) {}

    public convertCrawlingResults(combinedAxeResults: AxeCoreResults, scanResultData: ScanResultData): CombinedReportParameters {
        return this.combinedReportDataConverter.convert(combinedAxeResults, scanResultData);
    }
}
