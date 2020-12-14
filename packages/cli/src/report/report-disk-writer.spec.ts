// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as fs from 'fs';
import path from 'path';
import filenamifyUrl from 'filenamify-url';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { ReportDiskWriter } from './report-disk-writer';

/* eslint-disable no-empty,@typescript-eslint/no-empty-function, @typescript-eslint/consistent-type-assertions */

describe('ReportDiskWriter', () => {
    let fsMock: IMock<typeof fs>;
    let pathMock: IMock<typeof path>;
    let testSubject: ReportDiskWriter;

    beforeEach(() => {
        fsMock = Mock.ofInstance(fs, MockBehavior.Strict);
        pathMock = Mock.ofInstance(path, MockBehavior.Strict);
        testSubject = new ReportDiskWriter(fsMock.object, pathMock.object);
    });

    afterEach(() => {
        fsMock.verifyAll();
        pathMock.verifyAll();
    });

    it('output directory exists', () => {
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

        fsMock
            .setup((fsm) => fsm.existsSync(expectedDirectory))
            .returns(() => true)
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.writeFileSync(reportFilePath, content))
            .returns(() => {})
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.mkdirSync(expectedDirectory, { recursive: true }))
            .returns(() => {})
            .verifiable(Times.never());

        expect(testSubject.writeToDirectory(directory, fileName, format, content)).toEqual(reportFilePath);
    });

    it('output directory does not exists/file name is not url', () => {
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

        fsMock
            .setup((fsm) => fsm.existsSync('.'))
            .returns(() => false)
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.writeFileSync(reportFilePath, content))
            .returns(() => {})
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.mkdirSync('.', { recursive: true }))
            .returns(() => {})
            .verifiable(Times.once());

        expect(testSubject.writeToDirectory(directory, fileName, format, content)).toEqual(reportFilePath);
    });

    it('output directory is empty', () => {
        const platformSpecificDirectory = __dirname;
        const normalizedDirectory = platformSpecificDirectory.replace(/\\/g, '/');
        const fileName = 'http://www.bing.com';
        const format = 'html';
        const content = 'content';

        const reportFileName = `${filenamifyUrl(fileName, { replacement: '_' })}.${format}`;
        const reportFilePath = `${normalizedDirectory}/${reportFileName}`;

        pathMock
            .setup((fsm) => fsm.resolve(normalizedDirectory, reportFileName))
            .returns(() => reportFilePath)
            .verifiable(Times.once());

        fsMock
            .setup((fsm) => fsm.existsSync(normalizedDirectory))
            .returns(() => false)
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.writeFileSync(reportFilePath, content))
            .returns(() => {})
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.mkdirSync(normalizedDirectory, { recursive: true }))
            .returns(() => {})
            .verifiable(Times.once());

        expect(testSubject.writeToDirectory('', fileName, format, content)).toEqual(reportFilePath);
    });
});
