// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable, inject } from 'inversify';
import { AxeResults } from 'axe-core';
import { DataBase } from '../level-storage/data-base';
import { LocalBlobStore } from '../storage/local-blob-store';
import { BlobStore } from '../storage/store-types';
import { ScanResult, ScanMetadata } from '../level-storage/storage-documents';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class ScanResultReader implements AsyncIterable<ScanResult> {
    public constructor(
        @inject(DataBase) protected readonly dataBase: DataBase,
        @inject(LocalBlobStore) protected readonly blobStore: BlobStore,
    ) {}

    public [Symbol.asyncIterator](): AsyncIterator<ScanResult> {
        return this;
    }

    public async next(): Promise<IteratorResult<ScanResult>> {
        let nextData: IteratorResult<ScanResult>;
        do {
            nextData = await this.dataBase.next();
        } while (nextData?.done !== true && nextData?.value === undefined);

        if (nextData.done !== true) {
            const axeResults = await this.getAxeResults(nextData.value.id);
            const scanResult: ScanResult = {
                ...nextData.value,
                axeResults,
            };

            return {
                done: false,
                value: scanResult,
            };
        } else {
            return {
                done: true,
                value: undefined,
            };
        }
    }

    public async getScanMetadata(baseUrl: string): Promise<ScanMetadata> {
        return this.dataBase.getScanMetadata(baseUrl);
    }

    private async getAxeResults(id: string): Promise<AxeResults> {
        return (await this.blobStore.getValue(`${id}.axe`)) as AxeResults;
    }
}
