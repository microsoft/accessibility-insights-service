// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { SummaryScanError, SummaryScanResult } from 'temp-accessibility-insights-report';

// tslint:disable-next-line: match-default-export-name
import levelup, { LevelUp } from 'levelup';

// tslint:disable-next-line: match-default-export-name
import leveldown from 'leveldown';

@injectable()
export class DataBase {
    private db: LevelUp;

    constructor(protected readonly levelupObj: typeof levelup = levelup, protected readonly leveldownObj: typeof leveldown = leveldown) {}

    public async addFail(key: string, value: SummaryScanResult): Promise<void> {
        await this.open();
        await this.db.put(key, value);
    }

    public async addPass(key: string, value: SummaryScanResult): Promise<void> {
        await this.open();
        await this.db.put(key, value);
    }

    public async addError(key: string, value: SummaryScanError): Promise<void> {
        await this.open();
        await this.db.put(key, value);
    }

    private async open(): Promise<void> {
        if (this.db === undefined) {
            const dbLocation = process.env.APIFY_LOCAL_STORAGE_DIR;
            this.db = this.levelupObj(this.leveldownObj(`${dbLocation}/database`));
        }

        if (this.db.isClosed()) {
            await this.db.open();
        }
    }
}
