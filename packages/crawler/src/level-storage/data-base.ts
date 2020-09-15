// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { SummaryScanError, SummaryScanResult, SummaryScanResults } from 'accessibility-insights-report';
// tslint:disable: match-default-export-name import-name
import encode from 'encoding-down';
import { inject, injectable, optional } from 'inversify';
import leveldown from 'leveldown';
import levelup, { LevelUp } from 'levelup';
import { iocTypes } from '../types/ioc-types';

export type ResultType = 'fail' | 'error' | 'pass' | 'browserError';

export interface DataBaseKey {
    // tslint:disable-next-line:no-reserved-keywords
    type: ResultType;
    key: string;
}

export interface PageError {
    // tslint:disable-next-line:no-reserved-keywords
    url: string;
    error: string;
}

export interface ScanResults {
    summaryScanResults: SummaryScanResults;
    errors: PageError[];
}

@injectable()
export class DataBase {
    constructor(
        @inject(iocTypes.LevelUp) @optional() protected db?: LevelUp,
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

    public async addError(key: string, value: PageError): Promise<void> {
        const dbKey: DataBaseKey = { type: 'error', key: key };
        await this.add(dbKey, value);
    }

    public async addBrowserError(key: string, value: SummaryScanError): Promise<void> {
        const dbKey: DataBaseKey = { type: 'browserError', key: key };
        await this.add(dbKey, value);
    }

    public async add(key: DataBaseKey, value: SummaryScanError | SummaryScanResult | PageError): Promise<void> {
        await this.open();
        await this.db.put(key, value);
    }

    // tslint:disable: no-unsafe-any
    public async getScanResult(): Promise<ScanResults> {
        const failed: SummaryScanResult[] = [];
        const passed: SummaryScanResult[] = [];
        const browserErrors: SummaryScanError[] = [];
        const errors: PageError[] = [];

        await this.open();
        this.db.createReadStream().on('data', (data) => {
            const key: DataBaseKey = data.key as DataBaseKey;

            if (key.type === 'error') {
                const value: PageError = data.value as PageError;
                errors.push(value);
            } else if (key.type === 'browserError') {
                const value: SummaryScanError = data.value as SummaryScanError;
                browserErrors.push(value);
            } else {
                const value: SummaryScanResult = data.value as SummaryScanResult;
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
