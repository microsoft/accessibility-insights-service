// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Spinner } from 'cli-spinner';
import { inject, injectable } from 'inversify';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ReportGenerator } from '../report/report-generator';
import { AIScanner } from '../scanner/ai-scanner';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { ScanArguments } from '../types/scan-arguments';
import { CommandRunner } from './command-runner';

@injectable()
export class URLCommandRunner implements CommandRunner {
    constructor(
        @inject(AIScanner) private readonly scanner: AIScanner,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(ReportDiskWriter) private readonly reportDiskWriter: ReportDiskWriter,
    ) {}

    public async runCommand(scanArguments: ScanArguments): Promise<void> {
        const spinner = new Spinner('Running scanner...');
        let axeResults: AxeScanResults;

        try {
            spinner.start();

            axeResults = await this.scanner.scan(scanArguments.url);
        } finally {
            spinner.stop();
        }

        const reportContent = this.reportGenerator.generateReport(axeResults);

        this.reportDiskWriter.writeToDirectory(scanArguments.output, scanArguments.url, 'html', reportContent);
    }
}
