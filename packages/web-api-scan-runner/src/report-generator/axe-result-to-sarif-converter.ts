// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeResults } from 'axe-core';
import { SarifLog } from 'axe-sarif-converter';
import { inject, injectable } from 'inversify';
import { ReportFormat } from 'storage-documents';
import { iocTypeNames } from '../ioc-types';
import { AxeResultConverter } from './axe-result-converter';

@injectable()
export class AxeResultToSarifConverter implements AxeResultConverter {
    public readonly targetReportFormat: ReportFormat = 'sarif';

    constructor(@inject(iocTypeNames.ConvertAxeToSarifFunc) private readonly convertAxeToSarifFunc: (axeResults: AxeResults) => SarifLog) {}

    public convert(results: AxeResults): string {
        const sarifResults = this.convertAxeToSarifFunc(results);

        return JSON.stringify(sarifResults);
    }
}
