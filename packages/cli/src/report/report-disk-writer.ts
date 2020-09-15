// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { PageError } from 'accessibility-insights-crawler';
import filenamify from 'filenamify';
import filenamifyUrl from 'filenamify-url';
import * as fs from 'fs';
import { injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ReportFormats } from './report-formats';

@injectable()
export class ReportDiskWriter {
    constructor(private readonly fileSystemObj: typeof fs = fs) {}

    public writeToDirectory(directory: string, fileName: string, format: ReportFormats, content: string): string {
        if (isEmpty(directory)) {
            // tslint:disable-next-line: no-parameter-reassignment
            directory = '.';
        }

        let reportFileName;

        try {
            reportFileName = `${filenamifyUrl(fileName, { replacement: '_' })}.${format}`;
        } catch {
            reportFileName = `${filenamify(fileName, { replacement: '_' })}.${format}`;
        }

        if (!this.fileSystemObj.existsSync(directory)) {
            console.log('output directory does not exists.');
            console.log(`creating output directory - ${directory}`);
            this.fileSystemObj.mkdirSync(directory, { recursive: true });
        }

        this.fileSystemObj.writeFileSync(`${directory}/${reportFileName}`, content);

        return reportFileName;
    }

    public writeErrorLogToDirectory(directory: string, fileName: string, errors: PageError[]): void {
        if (isEmpty(directory)) {
            // tslint:disable-next-line: no-parameter-reassignment
            directory = '.';
        }

        if (!this.fileSystemObj.existsSync(directory)) {
            console.log('output directory does not exists.');
            console.log(`creating output directory - ${directory}`);
            this.fileSystemObj.mkdirSync(directory, { recursive: true });
        }

        const logger = this.fileSystemObj.createWriteStream(`${directory}/${fileName}`);

        errors.forEach((error) => {
            console.log(`error.url - ${error.url}`);
            console.log(`error.error - ${error.error}`);
            logger.write(`${error.url}\n`);
            logger.write(`${error.error}\n\n`);
        });

        logger.end();
    }
}
