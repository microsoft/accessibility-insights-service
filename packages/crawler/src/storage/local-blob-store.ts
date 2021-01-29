// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { inject, injectable, optional } from 'inversify';
import { crawlerIocTypes } from '../types/ioc-types';
import { BlobStore, scanResultStorageName } from './store-types';

/* eslint-disable @typescript-eslint/ban-types */
@injectable()
export class LocalBlobStore implements BlobStore {
    constructor(
        @inject(crawlerIocTypes.ApifyKeyValueStore) @optional() private keyValueStore?: Apify.KeyValueStore,
        private readonly apifyObj: typeof Apify = Apify,
    ) {}

    public async setValue(key: string, value: string | Object, options?: { contentType?: string }): Promise<void> {
        await this.open();
        await this.keyValueStore.setValue(key, value, options);
    }

    public async getValue(key: string): Promise<string | Object | Buffer | null> {
        await this.open();

        return this.keyValueStore.getValue(key);
    }

    private async open(storeName: string = scanResultStorageName): Promise<void> {
        if (this.keyValueStore === undefined) {
            this.keyValueStore = await this.apifyObj.openKeyValueStore(storeName);
        }
    }
}
