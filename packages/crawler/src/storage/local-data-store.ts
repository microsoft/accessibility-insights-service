// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';

import { DataStore } from './store-types';

export class LocalDataStore implements DataStore {
    constructor(public readonly storeName: string, private datasetStore?: Apify.Dataset, private readonly apifyObj: typeof Apify = Apify) {}

    public async pushData(data: object | object[]): Promise<void> {
        await this.open();
        await this.datasetStore.pushData(data);
    }

    private async open(): Promise<void> {
        if (this.datasetStore === undefined) {
            this.datasetStore = await this.apifyObj.openDataset(this.storeName);
        }
    }
}
