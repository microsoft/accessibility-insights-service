// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as fs from 'fs';
import { Container } from 'inversify';
import { BaseTelemetryProperties } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { ReportGenerator } from './report-generator';
import { ScanArguments } from './scan-arguments';
import { ScanRunner } from './scan-runner';

export class CliEntryPoint extends ProcessEntryPointBase {
    private scanArguments: ScanArguments;

    public setScanArguments(scanArguments: ScanArguments): void {
        this.scanArguments = scanArguments;
    }

    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'ais-cli' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        const scanRunner = container.get(ScanRunner);
        const reportGenerator = container.get(ReportGenerator);
        console.log('received args ', this.scanArguments);
        const axeResults = await scanRunner.scan(this.scanArguments.url);
        console.log(`accessibility issue count ${JSON.stringify(axeResults.results.violations.length)}`);
        const reportContent = reportGenerator.generateReport(axeResults);
        this.saveHtmlReport(axeResults.pageTitle, reportContent);
    }

    private saveHtmlReport(pageTitle: string, content: string): void {
        // tslint:disable-next-line: non-literal-fs-path
        fs.writeFile(`${pageTitle}.html`, content, err => {
            if (err !== undefined) {
                throw err;
            }
        });
    }
}
