// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as filenamify from 'filenamify-url';
import * as fs from 'fs';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { ReportDiskWriter } from './report-disk-writer';
import { ReportFormats } from './report-formats';

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
        const format = ReportFormats.html;
        const content = 'content';

        const reportFileName = `${directory}/${filenamify(fileName, { replacement: '_' })}.${format}`;

        fsMock
            .setup((fsm) => fsm.existsSync('.'))
            .returns(() => true)
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.writeFileSync(reportFileName, content))
            .returns(() => {})
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.mkdirSync('.'))
            .returns(() => {})
            .verifiable(Times.never());

        testSubject.writeToDirectory(directory, fileName, format, content);

        fsMock.verifyAll();
    });

    it('output directory does not exists', () => {
        const directory = '.';
        const fileName = 'http://www.bing.com';
        const format = ReportFormats.html;
        const content = 'content';

        const reportFileName = `${directory}/${filenamify(fileName, { replacement: '_' })}.${format}`;

        fsMock
            .setup((fsm) => fsm.existsSync('.'))
            .returns(() => false)
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.writeFileSync(reportFileName, content))
            .returns(() => {})
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.mkdirSync('.'))
            .returns(() => {})
            .verifiable(Times.once());

        testSubject.writeToDirectory(directory, fileName, format, content);

        fsMock.verifyAll();
    });

    it('output directory is empty', () => {
        const directory = '.';
        const fileName = 'http://www.bing.com';
        const format = ReportFormats.html;
        const content = 'content';

        const reportFileName = `${directory}/${filenamify(fileName, { replacement: '_' })}.${format}`;

        fsMock
            .setup((fsm) => fsm.existsSync('.'))
            .returns(() => false)
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.writeFileSync(reportFileName, content))
            .returns(() => {})
            .verifiable(Times.once());
        fsMock
            .setup((fsm) => fsm.mkdirSync('.'))
            .returns(() => {})
            .verifiable(Times.once());

        testSubject.writeToDirectory('', fileName, format, content);

        fsMock.verifyAll();
    });
});
