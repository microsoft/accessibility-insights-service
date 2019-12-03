// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeResults } from 'axe-core';
import { SarifLog } from 'axe-sarif-converter';
import { inject, injectable } from 'inversify';
import { ReportFormat } from 'storage-documents';
import { iocTypeNames } from '../ioc-types';
import { AxeResultConverter, ReportGenerationParams } from './axe-result-converter';

@injectable()
export class AxeResultToSarifConverter extends AxeResultConverter {
    public readonly reportType: ReportFormat = 'sarif';

    constructor(@inject(iocTypeNames.ConvertAxeToSarifFunc) private readonly convertAxeToSarifFunc: (axeResults: AxeResults) => SarifLog) {
        super();
    }

    public convert(results: AxeResults, params: ReportGenerationParams): string {
        const sarifResults = this.convertAxeToSarifFunc(results);

        return JSON.stringify(sarifResults);
    }
}
