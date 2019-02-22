import { AxeResults } from 'axe-core';
import { CosmosClientWrapper } from 'azure-client';

import { ResultConverter } from './result-converter';
import { ScanConfig } from './scan-task-runner';
import { Scanner } from './scanner';

export class ScanTaskSteps {
    constructor(
        private readonly config: ScanConfig,
        private readonly scanner: Scanner,
        private readonly cosmosClientWrapper: CosmosClientWrapper,
        private readonly resultConverter: ResultConverter,
    ) {}

    public async scanForA11yIssues(): Promise<AxeResults> {
        const results = await this.scanner.scan(this.config.scanUrl);
        console.log(`successfully scanned url ${this.config.scanUrl}`);

        return results;
    }

    public async storeIssues(axeResults: AxeResults): Promise<void> {
        const convertedResults = this.resultConverter.convert(axeResults, this.config);

        console.log('Storing issues in cosmos - ');
        await this.cosmosClientWrapper.upsertItems('scanner', 'a11yIssues', convertedResults);
        console.log('successfully stored issues in comos');
    }
}
