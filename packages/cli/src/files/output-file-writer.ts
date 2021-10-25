// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import filenamifyCombined from 'filenamify';
import { injectable } from 'inversify';
import normalizePath from 'normalize-path';
import { ensureDirectory } from 'common';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
const path = require('path');
const filenamifyUrl = require('filenamify-url');

/* eslint-disable security/detect-non-literal-fs-filename */

@injectable()
export class OutputFileWriter {
    constructor(
        private readonly fileSystemObj: typeof fs = fs,
        private readonly pathObj = path,
        private readonly ensureDirectoryFunc: typeof ensureDirectory = ensureDirectory,
    ) {}

    public writeToDirectory(directory: string, fileBaseName: string, fileExtension: string, content: string): string {
        let fileName;
        try {
            fileName = `${filenamifyUrl(fileBaseName, { replacement: '_' })}.${fileExtension}`;
        } catch {
            fileName = `${filenamifyCombined(fileBaseName, { replacement: '_' })}.${fileExtension}`;
        }

        return this.writeToDirectoryWithPreSanitizedFilename(directory, fileName, content);
    }

    public writeToDirectoryWithOriginalFilename(directory: string, originalFilePath: string, content: string): string {
        const originalFileName = this.pathObj.basename(originalFilePath);

        return this.writeToDirectoryWithPreSanitizedFilename(directory, originalFileName, content);
    }

    // Returns a normalized, absolute version of the original filePath
    public writeToFile(filePath: string, content: string): string {
        const normalizedPath = normalizePath(this.pathObj.resolve(filePath));
        const dirName = this.pathObj.dirname(normalizedPath);
        this.ensureDirectoryFunc(dirName);

        this.fileSystemObj.writeFileSync(normalizedPath, content);

        return normalizedPath;
    }

    private writeToDirectoryWithPreSanitizedFilename(directory: string, fileName: string, content: string): string {
        const normalizedDirectory = this.ensureDirectoryFunc(directory);
        const filePath = normalizePath(this.pathObj.resolve(normalizedDirectory, fileName));
        this.fileSystemObj.writeFileSync(filePath, content);

        return filePath;
    }
}
