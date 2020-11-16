// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as fs from 'fs';
import * as path from 'path';
import filenamify from 'filenamify';
import filenamifyUrl from 'filenamify-url';
import { injectable } from 'inversify';
import { isEmpty } from 'lodash';
import normalizePath from 'normalize-path';
import { ReportFormats } from './report-formats';

/* eslint-disable security/detect-non-literal-fs-filename */

@injectable()
export class ReportDiskWriter {
    constructor(private readonly fileSystemObj: typeof fs = fs, private readonly pathObj: typeof path = path) {}

    public writeToDirectory(directory: string, fileName: string, format: ReportFormats, content: string): string {
        let reportFileName;
        try {
            reportFileName = `${filenamifyUrl(fileName, { replacement: '_' })}.${format}`;
        } catch {
            reportFileName = `${filenamify(fileName, { replacement: '_' })}.${format}`;
        }

        const normalizedDirectory = this.ensureDirectory(directory);
        const filePath = normalizePath(this.pathObj.resolve(normalizedDirectory, reportFileName));
        this.fileSystemObj.writeFileSync(filePath, content);

        return filePath;
    }

    private ensureDirectory(directory: string): string {
        let normalizedDirectory: string;
        if (isEmpty(directory)) {
            normalizedDirectory = normalizePath(__dirname);
        } else {
            normalizedDirectory = normalizePath(directory);
        }

        if (!this.fileSystemObj.existsSync(normalizedDirectory)) {
            this.fileSystemObj.mkdirSync(normalizedDirectory, { recursive: true });
        }

        return normalizedDirectory;
    }
}
