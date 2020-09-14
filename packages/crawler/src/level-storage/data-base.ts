// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SummaryScanError, SummaryScanResult, SummaryScanResults } from 'accessibility-insights-report';
import { injectable } from 'inversify';

// tslint:disable-next-line: match-default-export-name
import levelup, { LevelUp } from 'levelup';

// tslint:disable-next-line: match-default-export-name
import leveldown from 'leveldown';

// tslint:disable-next-line:import-name match-default-export-name
import encode from 'encoding-down';

export type ResultType = 'fail' | 'error' | 'pass' | 'browserError';

export interface DataBaseKey {
    // tslint:disable-next-line:no-reserved-keywords
    type: ResultType;
    key: string;
}

export interface ScanError {
    // tslint:disable-next-line:no-reserved-keywords
    url: string;
    error: string;
}

export interface ScanResults {
    summaryScanResults: SummaryScanResults;
    errors: ScanError[];
}

@injectable()
export class DataBase {
    constructor(
        protected db?: LevelUp,
        protected readonly levelupObj: typeof levelup = levelup,
        protected readonly leveldownObj: typeof leveldown = leveldown,
        protected readonly encodeObj: typeof encode = encode,
    ) {}

    public async addFail(key: string, value: SummaryScanResult): Promise<void> {
        const dbKey: DataBaseKey = { type: 'fail', key: key };
        await this.add(dbKey, value);
    }

    public async addPass(key: string, value: SummaryScanResult): Promise<void> {
        const dbKey: DataBaseKey = { type: 'pass', key: key };
        await this.add(dbKey, value);
    }

    public async addError(key: string, value: ScanError): Promise<void> {
        const dbKey: DataBaseKey = { type: 'error', key: key };
        await this.add(dbKey, value);
    }

    public async addBrowserError(key: string, value: SummaryScanError): Promise<void> {
        const dbKey: DataBaseKey = { type: 'browserError', key: key };
        await this.add(dbKey, value);
    }

    public async add(key: DataBaseKey, value: SummaryScanError | SummaryScanResult | ScanError): Promise<void> {
        await this.open();
        await this.db.put(key, value);
    }

    // tslint:disable: no-unsafe-any
    public async getScanResult(): Promise<ScanResults> {
        const failed: SummaryScanResult[] = [];
        const passed: SummaryScanResult[] = [];
        const browserErrors: SummaryScanError[] = [];
        const errors: ScanError[] = [];

        await this.open();
        this.db.createReadStream().on('data', (data) => {
            const key: DataBaseKey = data.key as DataBaseKey;
            console.log(`${key.type} ${key.key}`);

            if (key.type === 'error') {
                const value: ScanError = data.value as ScanError;
                errors.push(value);
                console.log(`${value.url} ${value.error}`);
            } else if (key.type === 'browserError') {
                const value: SummaryScanError = data.value as SummaryScanError;
                browserErrors.push(value);
                console.log(`${value.url} ${value.errorType} ${value.errorDescription}`);
            } else {
                const value: SummaryScanResult = data.value as SummaryScanResult;
                console.log(`${value.url} ${value.numFailures} ${value.reportLocation}`);
                if (value.numFailures === 0) {
                    passed.push(value);
                } else {
                    failed.push(value);
                }
            }
        });

        return { errors: errors, summaryScanResults: { failed: failed, passed: passed, unscannable: browserErrors } };
    }

    public async open(outputDir: string = process.env.APIFY_LOCAL_STORAGE_DIR): Promise<void> {
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

export const dataBase = new DataBase();
