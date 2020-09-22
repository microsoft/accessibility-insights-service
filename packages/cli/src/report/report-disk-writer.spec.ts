// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import filenamifyUrl from 'filenamify-url';
import * as fs from 'fs';
import path, { ParsedPath } from 'path';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { ReportDiskWriter } from './report-disk-writer';

class WriteStreamMock {
    public end(): void {
        return;
    }

    // tslint:disable-next-line:no-any
    public write(chunk: any, cb?: (error: Error | null | undefined) => void): boolean {
        return true;
    }
}

// tslint:disable: no-empty no-http-string no-object-literal-type-assertion

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

    describe('writeToDirectory', () => {
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

        it('copy to directory', () => {
            const sourceFileName = './urls.txt';
            const sourceDirectory = './root/dir1\\dir2';
            const expectedTargetFileName = 'urls.txt';
            const expectedTargetDirectory = './root/dir1/dir2';
            const expectedTargetFilePath = `${expectedTargetDirectory}/${expectedTargetFileName}`;
            const parsedPath = { ext: '.txt', name: 'urls' } as ParsedPath;

            pathMock
                .setup((o) => o.parse(sourceFileName))
                .returns(() => parsedPath)
                .verifiable();
            pathMock
                .setup((o) => o.resolve(expectedTargetDirectory, expectedTargetFileName))
                .returns(() => expectedTargetFilePath)
                .verifiable();

            fsMock
                .setup((o) => o.existsSync(expectedTargetDirectory))
                .returns(() => true)
                .verifiable(Times.once());
            fsMock.setup((o) => o.copyFileSync(sourceFileName, expectedTargetFilePath)).verifiable();

            expect(testSubject.copyToDirectory(sourceFileName, sourceDirectory)).toEqual(expectedTargetFilePath);
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
            const directory = __dirname;
            const fileName = 'http://www.bing.com';
            const format = 'html';
            const content = 'content';

            const reportFileName = `${filenamifyUrl(fileName, { replacement: '_' })}.${format}`;
            const reportFilePath = `${directory}/${reportFileName}`;

            pathMock
                .setup((fsm) => fsm.resolve(directory, reportFileName))
                .returns(() => reportFilePath)
                .verifiable(Times.once());

            fsMock
                .setup((fsm) => fsm.existsSync(directory))
                .returns(() => false)
                .verifiable(Times.once());
            fsMock
                .setup((fsm) => fsm.writeFileSync(reportFilePath, content))
                .returns(() => {})
                .verifiable(Times.once());
            fsMock
                .setup((fsm) => fsm.mkdirSync(directory, { recursive: true }))
                .returns(() => {})
                .verifiable(Times.once());

            expect(testSubject.writeToDirectory('', fileName, format, content)).toEqual(reportFilePath);
        });
    });

    describe('writeErrorLogToDirectory', () => {
        it('output directory exists', () => {
            const directory = '.';
            const fileName = 'error.log';
            const content = [{ url: 'url', error: 'error' }];
            const reportFilePath = `${directory}/${fileName}`;

            pathMock
                .setup((fsm) => fsm.resolve(directory, fileName))
                .returns(() => reportFilePath)
                .verifiable(Times.once());

            fsMock
                .setup((fsm) => fsm.existsSync('.'))
                .returns(() => true)
                .verifiable(Times.once());
            fsMock
                .setup((fsm) => fsm.createWriteStream(reportFilePath))
                .returns(() => <fs.WriteStream>(<unknown>new WriteStreamMock()))
                .verifiable(Times.once());
            fsMock
                .setup((fsm) => fsm.mkdirSync('.', { recursive: true }))
                .returns(() => {})
                .verifiable(Times.never());

            expect(testSubject.writeErrorLogToDirectory(directory, fileName, content)).toEqual(reportFilePath);
        });

        it('output directory does not exists/file name is not url', () => {
            const directory = '.';
            const fileName = 'error.log';
            const content = [{ url: 'url', error: 'error' }];
            const reportFilePath = `${directory}/${fileName}`;

            pathMock
                .setup((fsm) => fsm.resolve(directory, fileName))
                .returns(() => reportFilePath)
                .verifiable(Times.once());

            fsMock
                .setup((fsm) => fsm.existsSync('.'))
                .returns(() => false)
                .verifiable(Times.once());
            fsMock
                .setup((fsm) => fsm.createWriteStream(reportFilePath))
                .returns(() => <fs.WriteStream>(<unknown>new WriteStreamMock()))
                .verifiable(Times.once());
            fsMock
                .setup((fsm) => fsm.mkdirSync('.', { recursive: true }))
                .returns(() => {})
                .verifiable(Times.once());

            expect(testSubject.writeErrorLogToDirectory(directory, fileName, content)).toEqual(reportFilePath);
        });

        it('output directory is empty', () => {
            const directory = __dirname;
            const fileName = 'error.log';
            const content = [{ url: 'url', error: 'error' }];
            const reportFilePath = `${directory}/${fileName}`;

            pathMock
                .setup((fsm) => fsm.resolve(directory, fileName))
                .returns(() => reportFilePath)
                .verifiable(Times.once());

            fsMock
                .setup((fsm) => fsm.existsSync(directory))
                .returns(() => false)
                .verifiable(Times.once());
            fsMock
                .setup((fsm) => fsm.createWriteStream(reportFilePath))
                .returns(() => <fs.WriteStream>(<unknown>new WriteStreamMock()))
                .verifiable(Times.once());
            fsMock
                .setup((fsm) => fsm.mkdirSync(directory, { recursive: true }))
                .returns(() => {})
                .verifiable(Times.once());

            expect(testSubject.writeErrorLogToDirectory('', fileName, content)).toEqual(reportFilePath);
        });
    });
});
