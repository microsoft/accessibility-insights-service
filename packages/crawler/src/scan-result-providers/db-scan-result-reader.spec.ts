// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { AxeResults } from 'axe-core';
import { BlobStore } from '../storage/store-types';
import { DataBase } from '../level-storage/data-base';
import { ScanMetadata } from '../level-storage/storage-documents';
import { DbScanResultReader } from './db-scan-result-reader';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(DbScanResultReader, () => {
    let blobStoreMock: IMock<BlobStore>;
    let dataBaseMock: IMock<DataBase>;
    let scanResultReader: DbScanResultReader;

    beforeEach(() => {
        blobStoreMock = Mock.ofType<BlobStore>();
        dataBaseMock = Mock.ofType(DataBase);

        scanResultReader = new DbScanResultReader(dataBaseMock.object, blobStoreMock.object);
    });

    afterEach(() => {
        blobStoreMock.verifyAll();
        dataBaseMock.verifyAll();
    });

    it('iterator next()', async () => {
        const expectedScanResults: IteratorResult<any>[] = [];
        const iteratorDataBaseResults = [
            {
                done: false,
                value: {
                    id: 'id1',
                },
            },
            {
                done: false,
                value: undefined,
            },
            {
                done: false,
                value: {
                    id: 'id2',
                },
            },
            {
                done: true,
                value: undefined,
            },
        ] as IteratorResult<any>[];

        iteratorDataBaseResults.map((iteratorDataBaseResult) => {
            let axeResults: AxeResults;
            if (iteratorDataBaseResult.value !== undefined) {
                axeResults = {
                    url: `scan-${iteratorDataBaseResult.value.id}`,
                } as AxeResults;
                blobStoreMock
                    .setup(async (o) => o.getValue(`${iteratorDataBaseResult.value.id}.axe`))
                    .returns(() => Promise.resolve(axeResults))
                    .verifiable();
            }

            const expectedScanResult = {
                ...iteratorDataBaseResult,
                value:
                    iteratorDataBaseResult.value !== undefined
                        ? {
                              ...iteratorDataBaseResult.value,
                              axeResults,
                          }
                        : undefined,
            } as IteratorResult<any>;
            expectedScanResults.push(expectedScanResult);

            dataBaseMock
                .setup(async (o) => o.next())
                .returns(() => Promise.resolve(iteratorDataBaseResult))
                .verifiable(Times.exactly(iteratorDataBaseResults.length));
        });

        let iteratorIndex = 0;
        const expectedScanResultsIndex = [0, 2];
        for await (const scanResult of scanResultReader) {
            expect(scanResult).toEqual(expectedScanResults[expectedScanResultsIndex[iteratorIndex++]]?.value);
        }
    });

    it('getScanMetadata', async () => {
        const baseUrl = 'baseUrl';
        const scanMetadata = { baseUrl } as ScanMetadata;
        dataBaseMock
            .setup(async (o) => o.getScanMetadata(baseUrl))
            .returns(() => Promise.resolve(scanMetadata))
            .verifiable();

        const actualScanMetadata = await scanResultReader.getScanMetadata(baseUrl);

        expect(actualScanMetadata).toEqual(scanMetadata);
    });
});
