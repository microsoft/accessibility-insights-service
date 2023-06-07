// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs from 'fs';
import path from 'path';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { ensureDirectory } from 'common';
import { OutputFileWriter } from './output-file-writer';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
const filenamifyUrl = require('filenamify-url');

/* eslint-disable no-empty,@typescript-eslint/no-empty-function, @typescript-eslint/consistent-type-assertions */

describe('OutputFileWriter', () => {
    let fileSystemMock: IMock<typeof fs>;
    let pathMock: IMock<typeof path>;
    let ensureDirectoryMock: IMock<typeof ensureDirectory>;
    let testSubject: OutputFileWriter;

    beforeEach(() => {
        fileSystemMock = Mock.ofInstance(fs, MockBehavior.Strict);
        pathMock = Mock.ofInstance(path, MockBehavior.Strict);
        ensureDirectoryMock = Mock.ofInstance(() => null);
        testSubject = new OutputFileWriter(fileSystemMock.object, pathMock.object, ensureDirectoryMock.object);
    });

    afterEach(() => {
        fileSystemMock.verifyAll();
        pathMock.verifyAll();
        ensureDirectoryMock.verifyAll();
    });

    describe('writeToDirectory', () => {
        it('normalizes URL fileNames using filenamifyUrl', () => {
            const directory = './root/dir1\\dir2';
            const expectedDirectory = './root/dir1/dir2';
            const fileName = 'http://www.bing.com';
            const format = 'html';
            const content = 'content';

            const reportFileName = `${filenamifyUrl(fileName, { replacement: '_' })}.${format}`;
            const reportFilePath = `${expectedDirectory}/${reportFileName}`;

            pathMock
                .setup((pm) => pm.resolve(expectedDirectory, reportFileName))
                .returns(() => reportFilePath)
                .verifiable(Times.once());
            ensureDirectoryMock
                .setup((ed) => ed(directory))
                .returns(() => expectedDirectory)
                .verifiable();
            fileSystemMock
                .setup((fsm) => fsm.writeFileSync(reportFilePath, content))
                .returns(() => {})
                .verifiable(Times.once());

            expect(testSubject.writeToDirectory(directory, fileName, format, content)).toEqual(reportFilePath);
        });

        it('uses filesystem-safe filenames as-is', () => {
            const directory = '.';
            const fileName = 'file name';
            const format = 'json';
            const content = 'content';

            const expectedFullFileName = `${fileName}.${format}`;
            const filePathFromPathResolve = `${directory}/${expectedFullFileName}`;

            pathMock
                .setup((pm) => pm.resolve(directory, expectedFullFileName))
                .returns(() => filePathFromPathResolve)
                .verifiable(Times.once());
            ensureDirectoryMock
                .setup((ed) => ed(directory))
                .returns(() => directory)
                .verifiable();
            fileSystemMock
                .setup((fsm) => fsm.writeFileSync(filePathFromPathResolve, content))
                .returns(() => {})
                .verifiable(Times.once());

            expect(testSubject.writeToDirectory(directory, fileName, format, content)).toEqual(filePathFromPathResolve);
        });
    });

    describe('writeToDirectoryWithOriginalFilename', () => {
        it('uses original filename as-is', () => {
            const directory = '.';
            const content = 'content';

            const originalFilePath = '/original/file/path.ext';
            const fileBasenameFromPath = 'path.ext';
            const filePathFromPathResolve = `${directory}/${fileBasenameFromPath}`;

            pathMock.setup((pm) => pm.basename(originalFilePath)).returns(() => fileBasenameFromPath);
            pathMock
                .setup((pm) => pm.resolve(directory, fileBasenameFromPath))
                .returns(() => filePathFromPathResolve)
                .verifiable(Times.once());
            ensureDirectoryMock
                .setup((ed) => ed(directory))
                .returns(() => directory)
                .verifiable();
            fileSystemMock
                .setup((fsm) => fsm.writeFileSync(filePathFromPathResolve, content))
                .returns(() => {})
                .verifiable(Times.once());

            expect(testSubject.writeToDirectoryWithOriginalFilename(directory, originalFilePath, content)).toEqual(filePathFromPathResolve);
        });
    });

    describe('writeToFile', () => {
        it('writes and returns against a normalized version of the filePath', () => {
            const content = 'content';
            const inputFilePath = './root/dir1\\dir2\\file.ext';
            const pathResolveOutput = './root/dir1/dir2/file.ext';
            const pathDirnameOutput = './root/dir1/dir2';

            pathMock
                .setup((pm) => pm.resolve(inputFilePath))
                .returns(() => pathResolveOutput)
                .verifiable(Times.once());
            pathMock
                .setup((pm) => pm.dirname(pathResolveOutput))
                .returns(() => pathDirnameOutput)
                .verifiable(Times.once());
            ensureDirectoryMock
                .setup((ed) => ed(pathDirnameOutput))
                .returns(() => pathDirnameOutput)
                .verifiable();
            fileSystemMock
                .setup((fsm) => fsm.writeFileSync(pathResolveOutput, content))
                .returns(() => {})
                .verifiable(Times.once());

            expect(testSubject.writeToFile(inputFilePath, content)).toEqual(pathResolveOutput);
        });
    });
});
