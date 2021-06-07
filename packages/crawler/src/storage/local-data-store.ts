// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';
import { inject, injectable, optional } from 'inversify';
import { crawlerIocTypes } from '../types/ioc-types';
import { DataStore, scanResultStorageName } from './store-types';

@injectable()
export class LocalDataStore implements DataStore {
    constructor(
        @inject(crawlerIocTypes.ApifyDataset) @optional() private datasetStore?: Apify.Dataset,
        private readonly apifyObj: typeof Apify = Apify,
    ) {}

    // eslint-disable-next-line @typescript-eslint/ban-types
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
