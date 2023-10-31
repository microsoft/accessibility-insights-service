// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { isEmpty } from 'lodash';
import { System } from 'accessibility-insights-crawler';
import { ReportNameGenerator } from './report/report-name-generator';
import { CrawlerCommandRunner } from './runner/crawler-command-runner';
import { ScanArguments } from './scan-arguments';
import { OutputFileWriter } from './files/output-file-writer';

export class CliEntryPoint {
    constructor(private readonly container: Container) {}

    public async runScan(scanArguments: ScanArguments): Promise<void> {
        try {
            const runArguments = scanArguments;
            if (!scanArguments.crawl && isEmpty(scanArguments.inputFile) && isEmpty(scanArguments.inputUrls)) {
                runArguments.singleWorker = true;
                runArguments.maxUrls = 1;
            }

            const commandRunner = this.container.get(CrawlerCommandRunner);
            await commandRunner.runCommand(runArguments);
        } catch (error) {
            const outputFileWriter = this.container.get(OutputFileWriter);
            const reportNameGenerator = this.container.get(ReportNameGenerator);
            const errorLog = outputFileWriter.writeToDirectory(
                scanArguments.output,
                reportNameGenerator.generateName('ai-cli-errors', new Date()),
                'log',
                `${System.serializeError(error)}`,
            );

            console.log((error as Error).message);
            console.log(
                `Something went wrong. Please try again later. If this persists, search for a known issue or file a new one at https://github.com/microsoft/accessibility-insights-service/issues.`,
            );
            console.log(`Error log was saved as ${errorLog}`);
        }
    }
}
