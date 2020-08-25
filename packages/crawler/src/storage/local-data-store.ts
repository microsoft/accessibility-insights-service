// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { injectable } from 'inversify';
import { DataStore, scanResultStorageName } from './store-types';

@injectable()
export class LocalDataStore implements DataStore {
    constructor(private datasetStore?: Apify.Dataset, private readonly apifyObj: typeof Apify = Apify) {}

    public async pushData(data: object | object[]): Promise<void> {
        await this.open();
        await this.datasetStore.pushData(data);
    }

    private async open(storeName: string = scanResultStorageName): Promise<void> {
        if (this.datasetStore === undefined) {
            this.datasetStore = await this.apifyObj.openDataset(storeName);
        }
    }
}
