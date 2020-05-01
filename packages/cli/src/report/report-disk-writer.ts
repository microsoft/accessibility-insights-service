// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as filenamify from 'filenamify-url';
import * as fs from 'fs';
import { injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ReportFormats } from './report-formats';

@injectable()
export class ReportDiskWriter {
    constructor(private readonly fileSystemObj: typeof fs = fs) {}

    public writeToDirectory(directory: string, fileName: string, format: ReportFormats, content: string): void {
        if (isEmpty(directory)) {
            // tslint:disable-next-line: no-parameter-reassignment
            directory = '.';
        }

        const reportFileName = `${directory}/${filenamify(fileName, { replacement: '_' })}.${format}`;

        if (!this.fileSystemObj.existsSync(directory)) {
            console.log('output directory does not exists.');
            console.log(`creating output directory - ${directory}`);
            this.fileSystemObj.mkdirSync(directory);
        }

        this.fileSystemObj.writeFileSync(reportFileName, content);
    }
}
