// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { SummaryScanError, SummaryScanResult, SummaryReportResults } from 'temp-accessibility-insights-report';

// tslint:disable-next-line: match-default-export-name
import levelup, { LevelUp } from 'levelup';

// tslint:disable-next-line: match-default-export-name
import leveldown from 'leveldown';

// tslint:disable-next-line:import-name match-default-export-name
import encode from 'encoding-down';

export type ResultType = 'fail' | 'error' | 'pass';

export interface DataBaseKey {
    // tslint:disable-next-line:no-reserved-keywords
    type: ResultType;
    key: string;
}

@injectable()
export class DataBase {
    private static db: LevelUp;

    constructor(
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

    public async addError(key: string, value: SummaryScanError): Promise<void> {
        const dbKey: DataBaseKey = { type: 'error', key: key };
        await this.add(dbKey, value);
    }

    public async add(key: DataBaseKey, value: SummaryScanError | SummaryScanResult): Promise<void> {
        await this.open();
        await DataBase.db.put(key, value);
    }

    // tslint:disable: no-unsafe-any
    public async createReadStream(): Promise<SummaryReportResults> {
        const failed: SummaryScanResult[] = [];
        const passed: SummaryScanResult[] = [];
        const unscannable: SummaryScanError[] = [];

        await this.open();
        DataBase.db.createReadStream().on('data', (data) => {
            const key: DataBaseKey = data.key as DataBaseKey;
            console.log(`${key.type} ${key.key}`);

            if (key.type === 'error') {
                const value: SummaryScanError = data.value as SummaryScanError;
                unscannable.push(value);
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

        return { failed, passed, unscannable };
    }

    public async open(outputDir: string = process.env.APIFY_LOCAL_STORAGE_DIR): Promise<void> {
        if (DataBase.db === undefined) {
            DataBase.db = this.levelupObj(
                this.encodeObj(this.leveldownObj(`${outputDir}/database`), { valueEncoding: 'json', keyEncoding: 'json' }),
            );
        }

        if (DataBase.db.isClosed()) {
            await DataBase.db.open();
        }
    }
}
