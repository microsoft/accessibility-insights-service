// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { SummaryScanError, SummaryScanResult } from 'accessibility-insights-report';
// tslint:disable: match-default-export-name import-name
import encode from 'encoding-down';
import { inject, injectable, optional } from 'inversify';
import leveldown from 'leveldown';
import levelup, { LevelUp } from 'levelup';
import { iocTypes } from '../types/ioc-types';
import { generateHash } from '../utility/crypto';
import { DataBaseKey, PageError, ScanMetadata, ScanResults } from './storage-documents';

@injectable()
export class DataBase {
    constructor(
        @inject(iocTypes.LevelUp) @optional() protected db?: LevelUp,
        protected readonly levelupObj: typeof levelup = levelup,
        protected readonly leveldownObj: typeof leveldown = leveldown,
        protected readonly encodeObj: typeof encode = encode,
    ) {}

    public async addFailedScanResult(key: string, value: SummaryScanResult): Promise<void> {
        const dbKey: DataBaseKey = { type: 'failedScanResult', key: key };
        await this.addItem(dbKey, value);
    }

    public async addPassedScanResult(key: string, value: SummaryScanResult): Promise<void> {
        const dbKey: DataBaseKey = { type: 'passedScanResult', key: key };
        await this.addItem(dbKey, value);
    }

    public async addError(key: string, value: PageError): Promise<void> {
        const dbKey: DataBaseKey = { type: 'runError', key: key };
        await this.addItem(dbKey, value);
    }

    public async addBrowserError(key: string, value: SummaryScanError): Promise<void> {
        const dbKey: DataBaseKey = { type: 'browserError', key: key };
        await this.addItem(dbKey, value);
    }

    public async addScanMetadata(scanMetadata: ScanMetadata): Promise<void> {
        const dbKey: DataBaseKey = { type: 'scanMetadata', key: generateHash(scanMetadata.baseUrl) };
        await this.addItem(dbKey, scanMetadata);
    }

    // tslint:disable: no-unsafe-any
    public async getScanResult(): Promise<ScanResults> {
        const failed: SummaryScanResult[] = [];
        const passed: SummaryScanResult[] = [];
        const browserErrors: SummaryScanError[] = [];
        const errors: PageError[] = [];
        let scanMetadata: ScanMetadata;

        await this.openDb();
        const stream = this.db.createReadStream();
        stream.on('data', (data) => {
            const key: DataBaseKey = data.key as DataBaseKey;

            if (key.type === 'runError') {
                errors.push(data.value);
            } else if (key.type === 'browserError') {
                browserErrors.push(data.value);
            } else if (key.type === 'passedScanResult') {
                passed.push(data.value);
            } else if (key.type === 'failedScanResult') {
                failed.push(data.value);
            } else if (key.type === 'scanMetadata') {
                scanMetadata = data.value;
            }
        });

        await new Promise((fulfill) => stream.on('end', fulfill));

        return {
            errors,
            summaryScanResults: { failed, passed, unscannable: browserErrors },
            scanMetadata,
        };
    }

    private async addItem(key: DataBaseKey, value: unknown): Promise<void> {
        await this.openDb();
        await this.db.put(key, value);
    }

    private async openDb(outputDir: string = process.env.APIFY_LOCAL_STORAGE_DIR): Promise<void> {
        if (this.db === undefined) {
            this.db = this.levelupObj(
                this.encodeObj(this.leveldownObj(`${outputDir}/database`), { valueEncoding: 'json', keyEncoding: 'json' }),
            );
        }

        if (this.db.isClosed()) {
            await this.db.open();
        }
    }
}
