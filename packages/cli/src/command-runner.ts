// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as filenamify from 'filenamify-url';
import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import * as rl from 'readline';
import { ReportGenerator } from './report/report-generator';
import { AIScanner } from './scanner/ai-scanner';
import { ScanArguments } from './scanner/scan-arguments';

@injectable()
export class CommandRunner {
    public domainNameRegExp = new RegExp('^(?:http://|www.|https://)([^/]+)', 'igm');

    constructor(
        @inject(AIScanner) private readonly scanner: AIScanner,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
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
        if (!fs.existsSync(scanArguments.output)) {
            console.log('output directory does not exists.');
            const line = rl.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            line.question('Do you want to create output directory? [Y/N]', answer => {
                switch (answer.toLowerCase()) {
                    case 'y':
                        console.log(`creating output directory - ${scanArguments.output}`);
                        // tslint:disable-next-line: non-literal-fs-path
                        fs.mkdirSync(scanArguments.output);
                        this.saveHtmlReport(reportFileName, reportContent);
                        break;
                    case 'n':
                        console.log('Please create output directory !');
                        process.exit(1);
                    default:
                        console.log('Invalid answer!');
                        process.exit(1);
                }
                line.close();
            });
        } else {
            this.saveHtmlReport(reportFileName, reportContent);
        }
    }

    private saveHtmlReport(fileName: string, content: string): void {
        // tslint:disable-next-line: non-literal-fs-path
        fs.writeFile(fileName, content, err => {
            if (!isEmpty(err)) {
                console.log(`error while saving scan report ${err}`);
            } else {
                console.log(`scan report saved successfully ${fileName}`);
            }
        });
    }
}
