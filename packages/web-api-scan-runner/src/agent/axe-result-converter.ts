// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { ReportFormat } from 'storage-documents';
import { AgentResultConverter } from './agent-result-converter';
import { AgentResults } from './agent-scanner';

@injectable()
export class AxeResultConverter implements AgentResultConverter {
    public readonly targetReportFormat: ReportFormat = 'axe';

    public convert(agentResults: AgentResults): string {
        const report = {
            results: agentResults.axeResults,
            scannedUrl: agentResults.scannedUrl,
        };

        return JSON.stringify(report);
    }
}
