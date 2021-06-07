// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as fs from 'fs';
import path from 'path';
import filenamifyUrl from 'filenamify-url';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { ensureDirectory } from 'common';
import { ReportDiskWriter } from './report-disk-writer';

/* eslint-disable no-empty,@typescript-eslint/no-empty-function, @typescript-eslint/consistent-type-assertions */

describe('ReportDiskWriter', () => {
    let fsMock: IMock<typeof fs>;
    let pathMock: IMock<typeof path>;
    let ensureDirectoryMock: IMock<typeof ensureDirectory>;
    let testSubject: ReportDiskWriter;

    beforeEach(() => {
        fsMock = Mock.ofInstance(fs, MockBehavior.Strict);
        pathMock = Mock.ofInstance(path, MockBehavior.Strict);
        ensureDirectoryMock = Mock.ofInstance(() => null);
        testSubject = new ReportDiskWriter(fsMock.object, pathMock.object, ensureDirectoryMock.object);
    });

    afterEach(() => {
        fsMock.verifyAll();
        pathMock.verifyAll();
        ensureDirectoryMock.verifyAll();
    });

    it('file name is url', () => {
        const directory = './root/dir1\\dir2';
        const expectedDirectory = './root/dir1/dir2';
        const fileName = 'http://www.bing.com';
        const format = 'html';
        const content = 'content';

        const reportFileName = `${filenamifyUrl(fileName, { replacement: '_' })}.${format}`;
        const reportFilePath = `${expectedDirectory}/${reportFileName}`;

        pathMock
            .setup((fsm) => fsm.resolve(expectedDirectory, reportFileName))
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

    it('file name is not url', () => {
        const directory = '.';
        const fileName = 'file name';
        const format = 'json';
        const content = 'content';

        const reportFileName = `${fileName}.${format}`;
        const reportFilePath = `${directory}/${reportFileName}`;

        pathMock
            .setup((fsm) => fsm.resolve(directory, reportFileName))
            .returns(() => reportFilePath)
            .verifiable(Times.once());
        ensureDirectoryMock
            .setup((ed) => ed(directory))
            .returns(() => directory)
            .verifiable();
        fsMock
            .setup((fsm) => fsm.writeFileSync(reportFilePath, content))
            .returns(() => {})
            .verifiable(Times.once());

        expect(testSubject.writeToDirectory(directory, fileName, format, content)).toEqual(reportFilePath);
    });
});
