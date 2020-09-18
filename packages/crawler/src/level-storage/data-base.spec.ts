// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { SummaryScanError, SummaryScanResult } from 'accessibility-insights-report';
import { LevelUp } from 'levelup';
import { IMock, Mock } from 'typemoq';
import { generateHash } from '../utility/crypto';
import { DataBase } from './data-base';
import { DataBaseKey, PageError, ScanMetadata } from './storage-documents';

describe(DataBase, () => {
    let dbMock: IMock<LevelUp>;
    let testSubject: DataBase;

    beforeEach(() => {
        dbMock = Mock.ofType<LevelUp>();
        testSubject = new DataBase(dbMock.object);
    });

    afterEach(() => {
        dbMock.verifyAll();
    });

    it('add passed scan result', async () => {
        const key: DataBaseKey = { type: 'passedScanResult', key: 'id' };
        const value: SummaryScanResult = { url: 'url', numFailures: 0, reportLocation: 'report location' };
        dbMock.setup(async (dbm) => dbm.put(key, value)).verifiable();

        await testSubject.addPassedScanResult('id', value);
    });

    it('add failed scan result', async () => {
        const key: DataBaseKey = { type: 'failedScanResult', key: 'id' };
        const value: SummaryScanResult = { url: 'url', numFailures: 0, reportLocation: 'report location' };
        dbMock.setup(async (dbm) => dbm.put(key, value)).verifiable();

        await testSubject.addFailedScanResult('id', value);
    });

    it('add scan metadata', async () => {
        const key: DataBaseKey = { type: 'scanMetadata', key: generateHash('baseUrl') };
        const value: ScanMetadata = { baseUrl: 'baseUrl', basePageTitle: 'basePageTitle' };
        dbMock.setup(async (dbm) => dbm.put(key, value)).verifiable();

        await testSubject.addScanMetadata(value);
    });

    it('add run error', async () => {
        const key: DataBaseKey = { type: 'runError', key: 'id' };
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
});
