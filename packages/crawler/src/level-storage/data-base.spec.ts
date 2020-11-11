// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { LevelUp } from 'levelup';
import { IMock, Mock, Times } from 'typemoq';
import { generateHash } from '../utility/crypto';
import { DataBase } from './data-base';
import { DataBaseKey, ScanMetadata, ScanResult } from './storage-documents';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(DataBase, () => {
    let dbMock: IMock<LevelUp>;
    let asyncIteratorMock: IMock<AsyncIterableIterator<string | Buffer>>;
    let readableStreamMock: IMock<NodeJS.ReadableStream>;
    let testSubject: DataBase;

    beforeEach(() => {
        dbMock = Mock.ofType<LevelUp>();
        asyncIteratorMock = Mock.ofType<AsyncIterableIterator<string | Buffer>>();
        readableStreamMock = Mock.ofType<NodeJS.ReadableStream>();

        testSubject = new DataBase(dbMock.object);
    });

    afterEach(() => {
        dbMock.verifyAll();
        asyncIteratorMock.verifyAll();
        readableStreamMock.verifyAll();
    });

    it('iterator next()', async () => {
        const dataItems = [
            {
                key: { key: 'key1', type: 'scanResult' },
                value: {
                    id: 'id1',
                },
            },
            {
                key: { key: 'key2', type: 'scanMetadata' },
                value: {
                    id: 'id2',
                },
            },
            {
                key: { key: 'key3', type: 'scanResult' },
                value: undefined,
            },
            {
                key: { key: 'key4', type: 'scanResult' },
                value: {
                    id: 'id4',
                },
            },
        ];

        let dataItemIndex = 0;
        let iteratorResult: IteratorResult<any>;
        asyncIteratorMock
            .setup(async (o) => o.next())
            .callback(() => {
                iteratorResult = {
                    done: dataItemIndex + 1 > dataItems.length,
                    value: dataItems[dataItemIndex],
                };
                dataItemIndex++;
            })
            .returns(() => Promise.resolve(iteratorResult))
            .verifiable(Times.exactly(dataItems.length + 1));
        readableStreamMock
            .setup((o) => o[Symbol.asyncIterator]())
            .returns(() => asyncIteratorMock.object)
            .verifiable();
        dbMock
            .setup((o) => o.createReadStream())
            .returns(() => readableStreamMock.object)
            .verifiable();

        let iteratorIndex = 0;
        const expectedDataItemsIndex = [0, 3];
        for await (const dataItem of testSubject) {
            expect(dataItem).toEqual(dataItems[expectedDataItemsIndex[iteratorIndex++]].value);
        }
    });

    it('add scan result', async () => {
        const key: DataBaseKey = { type: 'scanResult', key: 'id' };
        const value = { id: 'id', url: 'url' } as ScanResult;
        dbMock.setup(async (dbm) => dbm.put(key, value)).verifiable();

        await testSubject.addScanResult('id', value);
    });

    it('add scan metadata', async () => {
        const key: DataBaseKey = { type: 'scanMetadata', key: generateHash('baseUrl') };
        const value: ScanMetadata = { baseUrl: 'baseUrl', basePageTitle: 'basePageTitle' };
        dbMock.setup(async (dbm) => dbm.put(key, value)).verifiable();

        await testSubject.addScanMetadata(value);
    });

    it('get scan metadata', async () => {
        const key: DataBaseKey = { type: 'scanMetadata', key: generateHash('baseUrl') };
        const value: ScanMetadata = { baseUrl: 'baseUrl', basePageTitle: 'basePageTitle' };
        dbMock
            .setup(async (dbm) => dbm.get(key))
            .returns(() => Promise.resolve(value))
            .verifiable();

        const actualValue = await testSubject.getScanMetadata('baseUrl');

        expect(value).toBe(actualValue);
    });
});
