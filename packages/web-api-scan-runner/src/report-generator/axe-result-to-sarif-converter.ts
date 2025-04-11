// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeResults } from 'axe-core';
import { SarifLog } from 'axe-sarif-converter';
import { inject, injectable } from 'inversify';
import { ReportFormat, ReportSource } from 'storage-documents';
import { ReportResult } from 'scanner-global-library';
import { iocTypeNames } from '../ioc-types';
import { AxeResultConverter } from './axe-result-converter';

@injectable()
export class AxeResultToSarifConverter implements AxeResultConverter {
    public readonly targetReportFormat: ReportFormat = 'sarif';

    public readonly targetReportSource: ReportSource[] = ['accessibility-scan', 'accessibility-agent', 'accessibility-combined'];

    constructor(@inject(iocTypeNames.ConvertAxeToSarifFunc) private readonly convertAxeToSarifFunc: (axeResults: AxeResults) => SarifLog) {}

    public convert(reportResult: ReportResult): string {
        const sarifResults = this.convertAxeToSarifFunc(reportResult.axeResults);

        return JSON.stringify(sarifResults);
    }
}
