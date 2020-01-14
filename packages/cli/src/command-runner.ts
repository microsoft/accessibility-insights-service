// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as filenamify from 'filenamify-url';
import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ReportGenerator } from './report/report-generator';
import { AIScanner } from './scanner/ai-scanner';
import { ScanArguments } from './scanner/scan-arguments';

@injectable()
export class CommandRunner {
    public domainNameRegExp = new RegExp('^(?:http://|www.|https://)([^/]+)', 'igm');

    constructor(
        @inject(AIScanner) private readonly scanner: AIScanner,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        private readonly fileSystemObj: typeof fs = fs,
    ) {}

    public async runCommand(scanArguments: ScanArguments): Promise<void> {
        if (isEmpty(scanArguments.output)) {
            scanArguments.output = '.';
        }
        const axeResults = await this.scanner.scan(scanArguments.url);
        //console.log(`Found ${JSON.stringify(axeResults.results.violations.length)} accessibility issues`);
        const reportContent = this.reportGenerator.generateReport(axeResults);
        const reportFileName = `${scanArguments.output}/${filenamify(scanArguments.url, { replacement: '_' })}.html`;

        // tslint:disable-next-line: non-literal-fs-path
        if (!this.fileSystemObj.existsSync(scanArguments.output)) {
            console.log('output directory does not exists.');
            console.log(`creating output directory - ${scanArguments.output}`);
            // tslint:disable-next-line: non-literal-fs-path
            this.fileSystemObj.mkdirSync(scanArguments.output);
        }

        this.saveHtmlReport(reportFileName, reportContent);
    }

    private saveHtmlReport(fileName: string, content: string): void {
        // tslint:disable-next-line: non-literal-fs-path
        this.fileSystemObj.writeFileSync(fileName, content);
        console.log(`scan report saved successfully ${fileName}`);
    }
}
