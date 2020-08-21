// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import filenamify from 'filenamify-url';
import * as fs from 'fs';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { ReportDiskWriter } from './report-disk-writer';

// tslint:disable: no-empty no-http-string
describe('ReportDiskWriter', () => {
    let fsMock: IMock<typeof fs>;
    let testSubject: ReportDiskWriter;

    beforeEach(() => {
        fsMock = Mock.ofInstance(fs, MockBehavior.Strict);
        testSubject = new ReportDiskWriter(fsMock.object);
    });

    it('output directory exists', () => {
        const directory = '.';
        const fileName = 'http://www.bing.com';
        const format = 'html';
        const content = 'content';

        const reportFileName = `${filenamify(fileName, { replacement: '_' })}.${format}`;
        const reportFilePath = `${directory}/${reportFileName}`;

        fsMock
            .setup((fsm) => fsm.existsSync('.'))
            .returns(() => true)
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.writeFileSync(reportFilePath, content))
            .returns(() => {})
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.mkdirSync('.'))
            .returns(() => {})
            .verifiable(Times.never());

        expect(testSubject.writeToDirectory(directory, fileName, format, content)).toEqual(reportFileName);

        fsMock.verifyAll();
    });

    it('output directory does not exists/file name is not url', () => {
        const directory = '.';
        const fileName = 'file name';
        const format = 'json';
        const content = 'content';

        const reportFileName = `${fileName}.${format}`;
        const reportFilePath = `${directory}/${reportFileName}`;
        fsMock
            .setup((fsm) => fsm.existsSync('.'))
            .returns(() => false)
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.writeFileSync(reportFilePath, content))
            .returns(() => {})
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.mkdirSync('.'))
            .returns(() => {})
            .verifiable(Times.once());

        expect(testSubject.writeToDirectory(directory, fileName, format, content)).toEqual(reportFileName);

        fsMock.verifyAll();
    });

    it('output directory is empty', () => {
        const directory = '.';
        const fileName = 'http://www.bing.com';
        const format = 'html';
        const content = 'content';

        const reportFileName = `${filenamify(fileName, { replacement: '_' })}.${format}`;
        const reportFilePath = `${directory}/${reportFileName}`;

        fsMock
            .setup((fsm) => fsm.existsSync('.'))
            .returns(() => false)
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.writeFileSync(reportFilePath, content))
            .returns(() => {})
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.mkdirSync('.'))
            .returns(() => {})
            .verifiable(Times.once());

        expect(testSubject.writeToDirectory('', fileName, format, content)).toEqual(reportFileName);

        fsMock.verifyAll();
    });
});
