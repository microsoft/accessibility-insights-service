// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeResults } from 'axe-core';
import { SarifLog } from 'axe-sarif-converter';
import { inject, injectable } from 'inversify';
import { ReportFormat, ReportSource } from 'storage-documents';
import { AxeScanResults } from 'scanner-global-library';
import { iocTypeNames } from '../ioc-types';
import { AxeResultConverter } from './axe-result-converter';

@injectable()
export class AxeResultToSarifConverter implements AxeResultConverter {
    public readonly targetReportFormat: ReportFormat = 'sarif';

    public readonly targetReportSource: ReportSource[] = ['accessibility-scan', 'accessibility-combined'];

    constructor(@inject(iocTypeNames.ConvertAxeToSarifFunc) private readonly convertAxeToSarifFunc: (axeResults: AxeResults) => SarifLog) {}

    public convert(axeScanResults: AxeScanResults): string {
        const sarifResults = this.convertAxeToSarifFunc(axeScanResults.results);

        return JSON.stringify(sarifResults);
    }
}
