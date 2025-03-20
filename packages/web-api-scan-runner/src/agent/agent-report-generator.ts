// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { GeneratedReport } from 'service-library';
import { iocTypeNames } from '../ioc-types';
import { AgentResults } from '../scanner/agent-scanner';
import { AgentResultConverter } from './agent-result-converter';

@injectable()
export class AgentReportGenerator {
    constructor(
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(iocTypeNames.AgentResultConverters) private readonly agentResultConverters: AgentResultConverter[],
    ) {}

    public generateReports(agentResults: AgentResults): GeneratedReport[] {
        return this.agentResultConverters.map<GeneratedReport>((agentResultConverter) => {
            return {
                content: agentResultConverter.convert(agentResults),
                id: this.guidGenerator.createGuid(),
                format: agentResultConverter.targetReportFormat,
                source: 'accessibility-agent',
            };
        });
    }
}
