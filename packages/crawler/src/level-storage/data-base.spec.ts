// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { SummaryScanError, SummaryScanResult } from 'accessibility-insights-report';
import { LevelUp } from 'levelup';
import { IMock, Mock } from 'typemoq';
import { DataBase, DataBaseKey, PageError } from './data-base';

describe(DataBase, () => {
    let dbMock: IMock<LevelUp>;
    let testSubject: DataBase;

    beforeEach(() => {
        dbMock = Mock.ofType<LevelUp>();

        testSubject = new DataBase(dbMock.object);
    });

    it('add pass', async () => {
        const key: DataBaseKey = { type: 'pass', key: 'id' };
        const value: SummaryScanResult = { url: 'url', numFailures: 0, reportLocation: 'report location' };
        dbMock.setup(async (dbm) => dbm.put(key, value)).verifiable();

        await testSubject.addPass('id', value);
    });

    it('add fail', async () => {
        const key: DataBaseKey = { type: 'fail', key: 'id' };
        const value: SummaryScanResult = { url: 'url', numFailures: 0, reportLocation: 'report location' };
        dbMock.setup(async (dbm) => dbm.put(key, value)).verifiable();

        await testSubject.addFail('id', value);
    });

    it('add error', async () => {
        const key: DataBaseKey = { type: 'error', key: 'id' };
        const value: PageError = {
            url: 'url',
            error: 'error',
        };
        dbMock.setup(async (dbm) => dbm.put(key, value)).verifiable();

        await testSubject.addError('id', value);
    });

    it('add browser error', async () => {
        const key: DataBaseKey = { type: 'browserError', key: 'id' };
        const value: SummaryScanError = {
            url: 'url',
            errorType: 'error type',
            errorDescription: 'error description',
            errorLogLocation: 'error log location',
        };
        dbMock.setup(async (dbm) => dbm.put(key, value)).verifiable();

        await testSubject.addBrowserError('id', value);
    });

    afterEach(() => {
        dbMock.verifyAll();
    });
});
