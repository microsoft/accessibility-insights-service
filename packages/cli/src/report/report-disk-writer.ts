// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { PageError } from 'accessibility-insights-crawler';
import filenamify from 'filenamify';
import filenamifyUrl from 'filenamify-url';
import * as fs from 'fs';
import { injectable } from 'inversify';
import { isEmpty } from 'lodash';
import * as path from 'path';
import { ReportFormats } from './report-formats';

@injectable()
export class ReportDiskWriter {
    constructor(private readonly fileSystemObj: typeof fs = fs, private readonly pathObj: typeof path = path) {}

    public writeToDirectory(directory: string, fileName: string, format: ReportFormats, content: string): string {
        if (isEmpty(directory)) {
            // tslint:disable-next-line: no-parameter-reassignment
            directory = __dirname;
        }

        console.log(1);

        let reportFileName;

        try {
            console.log(2);
            reportFileName = `${filenamifyUrl(fileName, { replacement: '_' })}.${format}`;
            console.log(3);
        } catch {
            console.log(4);
            reportFileName = `${filenamify(fileName, { replacement: '_' })}.${format}`;
            console.log(5);
        }

        console.log(6);

        if (!this.fileSystemObj.existsSync(directory)) {
            this.fileSystemObj.mkdirSync(directory, { recursive: true });
        }

        console.log(reportFileName);

        const filePath = this.pathObj.resolve(directory, reportFileName);

        console.log(filePath);

        this.fileSystemObj.writeFileSync(filePath, content);

        return filePath;
    }

    public writeErrorLogToDirectory(directory: string, fileName: string, errors: PageError[]): string {
        if (isEmpty(directory)) {
            // tslint:disable-next-line: no-parameter-reassignment
            directory = __dirname;
        }

        if (!this.fileSystemObj.existsSync(directory)) {
            this.fileSystemObj.mkdirSync(directory, { recursive: true });
        }

        const filePath = this.pathObj.resolve(directory, fileName);

        const logger = this.fileSystemObj.createWriteStream(filePath);

        errors.forEach((error) => {
            logger.write(`${error.url}\n`);
            logger.write(`${error.error}\n\n`);
        });

        logger.end();

        return filePath;
    }
}
