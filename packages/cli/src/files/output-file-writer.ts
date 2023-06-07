// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import fs from 'fs';
import path from 'path';
import filenamifyCombined from 'filenamify';
import { injectable } from 'inversify';
import normalizePath from 'normalize-path';
import { ensureDirectory } from 'common';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
const filenamifyUrl = require('filenamify-url');

/* eslint-disable security/detect-non-literal-fs-filename */

@injectable()
export class OutputFileWriter {
    constructor(
        private readonly fileSystem: typeof fs = fs,
        private readonly fileSystemPath = path,
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
        const originalFileName = this.fileSystemPath.basename(originalFilePath);

        return this.writeToDirectoryWithPreSanitizedFilename(directory, originalFileName, content);
    }

    // Returns a normalized, absolute version of the original filePath
    public writeToFile(filePath: string, content: string): string {
        const normalizedPath = normalizePath(this.fileSystemPath.resolve(filePath));
        const dirName = this.fileSystemPath.dirname(normalizedPath);
        this.ensureDirectoryFunc(dirName);

        this.fileSystem.writeFileSync(normalizedPath, content);

        return normalizedPath;
    }

    private writeToDirectoryWithPreSanitizedFilename(directory: string, fileName: string, content: string): string {
        const normalizedDirectory = this.ensureDirectoryFunc(directory);
        const filePath = normalizePath(this.fileSystemPath.resolve(normalizedDirectory, fileName));
        this.fileSystem.writeFileSync(filePath, content);

        return filePath;
    }
}
