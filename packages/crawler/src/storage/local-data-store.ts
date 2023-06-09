// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import * as Crawlee from '@crawlee/puppeteer';
import { DataStore, scanResultStorageName } from './store-types';

@injectable()
export class LocalDataStore implements DataStore {
    private dataset: Crawlee.Dataset;

    // eslint-disable-next-line @typescript-eslint/ban-types
    public async pushData(data: object | object[]): Promise<void> {
        await this.open();
        await this.dataset.pushData(data);
    }

    private async open(): Promise<void> {
        if (this.dataset === undefined) {
            this.dataset = await Crawlee.Dataset.open(scanResultStorageName);
        }
    }
}
