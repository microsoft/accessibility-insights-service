// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ReportGenerator } from '../report/report-generator';
import { AIScanner } from '../scanner/ai-scanner';
import { AxeScanResults } from '../scanner/axe-scan-results';

@injectable()
export class SingleScanRunner {
    constructor(
        @inject(AIScanner) private readonly scanner: AIScanner,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
    ) { }

    public async getScanReport(url: string): Promise<string> {
        let axeResults: AxeScanResults;
        axeResults = await this.scanner.scan(url);
        return this.reportGenerator.generateReport(axeResults);
    }
}
