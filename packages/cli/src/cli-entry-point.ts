// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { isEmpty } from 'lodash';
import { System } from 'common';
import { ReportDiskWriter } from './report/report-disk-writer';
import { ReportNameGenerator } from './report/report-name-generator';
import { CommandRunner } from './runner/command-runner';
import { CrawlerCommandRunner } from './runner/crawler-command-runner';
import { UrlCommandRunner } from './runner/url-command-runner';
import { ScanArguments } from './scan-arguments';

export class CliEntryPoint {
    constructor(private readonly container: Container) {}

    public async runScan(scanArguments: ScanArguments): Promise<void> {
        try {
            const commandRunner = this.getCommandRunner(scanArguments);
            await commandRunner.runCommand(scanArguments);
        } catch (error) {
            const reportDiskWriter = this.container.get(ReportDiskWriter);
            const reportNameGenerator = this.container.get(ReportNameGenerator);
            const errorLog = reportDiskWriter.writeToDirectory(
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

    private getCommandRunner(scanArguments: ScanArguments): CommandRunner {
        if (!scanArguments.crawl && isEmpty(scanArguments.inputFile) && isEmpty(scanArguments.inputUrls)) {
            return this.container.get(UrlCommandRunner);
        } else {
            return this.container.get(CrawlerCommandRunner);
        }
    }
}
