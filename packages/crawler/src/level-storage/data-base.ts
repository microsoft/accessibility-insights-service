// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
/* eslint-disable @typescript-eslint/tslint/config */
import encode from 'encoding-down';
import { inject, injectable, optional } from 'inversify';
import leveldown from 'leveldown';
import levelup, { LevelUp } from 'levelup';
import { iocTypes } from '../types/ioc-types';
import { generateHash } from '../utility/crypto';
import { DataBaseKey, ScanMetadata, ScanResult } from './storage-documents';

/* eslint-enable @typescript-eslint/tslint/config */
/* eslint-disable @typescript-eslint/no-explicit-any */

export const genericKey = 'genericKey';

@injectable()
export class DataBase implements AsyncIterable<ScanResult> {
    private iterator: AsyncIterableIterator<string | Buffer>;

    constructor(
        @inject(iocTypes.LevelUp) @optional() protected db?: LevelUp,
        protected readonly levelupObj: typeof levelup = levelup,
        protected readonly leveldownObj: typeof leveldown = leveldown,
        protected readonly encodeObj: typeof encode = encode,
    ) {}

    public [Symbol.asyncIterator](): AsyncIterator<ScanResult> {
        return this;
    }

    public async next(): Promise<IteratorResult<ScanResult>> {
        if (this.iterator === undefined) {
            await this.openDb();
            this.iterator = this.db.createReadStream()[Symbol.asyncIterator]();
        }

        let key: DataBaseKey;
        let nextData: IteratorResult<any>;
        do {
            nextData = await this.iterator.next();
            key = nextData?.value?.key;
        } while (nextData?.done !== true && (key.type !== 'scanResult' || nextData.value?.value === undefined));

        if (nextData.done !== true) {
            return {
                done: false,
                value: nextData.value.value,
            };
        } else {
            this.iterator = undefined;

            return {
                done: true,
                value: undefined,
            };
        }
    }

    public async addScanResult(key: string, value: ScanResult): Promise<void> {
        const dbKey: DataBaseKey = { type: 'scanResult', key: key };
        await this.addItem(dbKey, value);
    }

    public async addScanMetadata(scanMetadata: ScanMetadata): Promise<void> {
        const dbKey: DataBaseKey = { type: 'scanMetadata', key: generateHash(scanMetadata.baseUrl ?? genericKey) };
        await this.addItem(dbKey, scanMetadata);
    }

    public async getScanMetadata(baseUrl: string): Promise<ScanMetadata> {
        await this.openDb();
        const dbKey: DataBaseKey = { type: 'scanMetadata', key: generateHash(baseUrl ?? genericKey) };
        const value = await this.db.get(dbKey);

        return value as ScanMetadata;
    }

    public async openDb(outputDir: string = process.env.APIFY_LOCAL_STORAGE_DIR): Promise<void> {
        if (this.db === undefined) {
            this.db = this.levelupObj(
                this.encodeObj(this.leveldownObj(`${outputDir}/database`), { valueEncoding: 'json', keyEncoding: 'json' }),
            );
        }

        if (this.db.isClosed()) {
            await this.db.open();
        }
    }

    private async addItem(key: DataBaseKey, value: unknown): Promise<void> {
        await this.openDb();
        await this.db.put(key, value);
    }
}
