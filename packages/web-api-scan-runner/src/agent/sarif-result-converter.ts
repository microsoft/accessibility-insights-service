// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeResults } from 'axe-core';
import { SarifLog } from 'axe-sarif-converter';
import { inject, injectable } from 'inversify';
import { ReportFormat } from 'storage-documents';
import { iocTypeNames } from '../ioc-types';
import { AgentResultConverter } from './agent-result-converter';
import { AgentResults } from './agent-scanner';

@injectable()
export class SarifResultConverter implements AgentResultConverter {
    public readonly targetReportFormat: ReportFormat = 'sarif';

    constructor(@inject(iocTypeNames.ConvertAxeToSarifFunc) private readonly convertAxeToSarifFunc: (axeResults: AxeResults) => SarifLog) {}

    public convert(agentResults: AgentResults): string {
        const sarifResults = this.convertAxeToSarifFunc(agentResults.axeResults);

        return JSON.stringify(sarifResults);
    }
}
