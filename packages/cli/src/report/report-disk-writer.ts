// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import * as path from 'path';
import filenamifyCombined from 'filenamify';
import filenamifyUrl from 'filenamify-url';
import { injectable } from 'inversify';
import normalizePath from 'normalize-path';
import { ensureDirectory } from 'common';
import { ReportFormats } from './report-formats';

/* eslint-disable security/detect-non-literal-fs-filename */

@injectable()
export class ReportDiskWriter {
    constructor(
        private readonly fileSystemObj: typeof fs = fs,
        private readonly pathObj: typeof path = path,
        private readonly ensureDirectoryFunc: typeof ensureDirectory = ensureDirectory,
    ) {}

    public writeToDirectory(directory: string, fileName: string, format: ReportFormats, content: string): string {
        let reportFileName;
        try {
            reportFileName = `${filenamifyUrl(fileName, { replacement: '_' })}.${format}`;
        } catch {
            reportFileName = `${filenamifyCombined(fileName, { replacement: '_' })}.${format}`;
        }

        const normalizedDirectory = this.ensureDirectoryFunc(directory);
        const filePath = normalizePath(this.pathObj.resolve(normalizedDirectory, reportFileName));
        this.fileSystemObj.writeFileSync(filePath, content);

        return filePath;
    }
}
