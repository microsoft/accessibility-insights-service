// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as fs from 'fs';
import path from 'path';
import filenamifyUrl from 'filenamify-url';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { ensureDirectory } from 'common';
import { OutputFileWriter } from './output-file-writer';

/* eslint-disable no-empty,@typescript-eslint/no-empty-function, @typescript-eslint/consistent-type-assertions */

describe('OutputFileWriter', () => {
    let fsMock: IMock<typeof fs>;
    let pathMock: IMock<typeof path>;
    let ensureDirectoryMock: IMock<typeof ensureDirectory>;
    let testSubject: OutputFileWriter;

    beforeEach(() => {
        fsMock = Mock.ofInstance(fs, MockBehavior.Strict);
        pathMock = Mock.ofInstance(path, MockBehavior.Strict);
        ensureDirectoryMock = Mock.ofInstance(() => null);
        testSubject = new OutputFileWriter(fsMock.object, pathMock.object, ensureDirectoryMock.object);
    });

    afterEach(() => {
        fsMock.verifyAll();
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
            fsMock
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
            fsMock
                .setup((fsm) => fsm.writeFileSync(filePathFromPathResolve, content))
                .returns(() => {})
                .verifiable(Times.once());

            expect(testSubject.writeToDirectory(directory, fileName, format, content)).toEqual(filePathFromPathResolve);
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
            fsMock
                .setup((fsm) => fsm.writeFileSync(pathResolveOutput, content))
                .returns(() => {})
                .verifiable(Times.once());

            expect(testSubject.writeToFile(inputFilePath, content)).toEqual(pathResolveOutput);
        });
    });
});
