// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Container } from 'inversify';
import { isEmpty } from 'lodash';
import { ReportDiskWriter } from './report/report-disk-writer';
import { ReportNameGenerator } from './report/report-name-generator';
import { CommandRunner } from './runner/command-runner';
import { CrawlerCommandRunner } from './runner/crawler-command-runner';
import { FileCommandRunner } from './runner/file-command-runner';
import { URLCommandRunner } from './runner/url-command-runner';
import { ScanArguments } from './scanner/scan-arguments';

export class CliEntryPoint {
    constructor(private readonly container: Container) {}

    public async runScan(scanArguments: ScanArguments): Promise<void> {
        try {
            const commandRunner = this.getCommandRunner(scanArguments);
            await commandRunner.runCommand(scanArguments);
        } catch (error) {
            const reportDiskWriter = this.container.get(ReportDiskWriter);
            const reportNameGenerator = this.container.get(ReportNameGenerator);

            if (scanArguments.crawl) {
                console.log(`Crawling and scanning page ${scanArguments.url} aborted`);
            }

            console.log(
                `Something went wrong. Please try again later. If this persists, search for a known issue or file a new one at https://github.com/microsoft/accessibility-insights-service/issues.`,
            );

            const errorLog = reportDiskWriter.writeToDirectory(
                scanArguments.output,
                reportNameGenerator.generateName('ai-cli-errors', new Date()),
                'log',
                `${error}`,
            );

            console.log(`Error log was saved as ${errorLog}`);
        }
    }

    private getCommandRunner(scanArguments: ScanArguments): CommandRunner {
        if (scanArguments.crawl) {
            return this.container.get(CrawlerCommandRunner);
        } else {
            if (!isEmpty(scanArguments.url)) {
                return this.container.get(URLCommandRunner);
            } else if (!isEmpty(scanArguments.inputFile)) {
                return this.container.get(FileCommandRunner);
            } else {
                throw new Error('The specified scan options combination is not supported.');
            }
        }
    }
}
