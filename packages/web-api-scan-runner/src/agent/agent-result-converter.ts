// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ReportFormat } from 'storage-documents';
import { AgentResults } from '../scanner/agent-scanner';

export interface AgentResultConverter {
    readonly targetReportFormat: ReportFormat;
    convert(agentResults: AgentResults): string;
}
