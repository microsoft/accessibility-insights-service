// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { injectable } from 'inversify';
import { BlobStore, scanResultStorageName } from './store-types';

@injectable()
export class LocalBlobStore implements BlobStore {
    constructor(
        private keyValueStore?: Apify.KeyValueStore,
        private readonly apifyObj: typeof Apify = Apify,
    ) {}

    public async setValue(key: string, value: string | Object, options?: { contentType?: string }): Promise<void> {
        await this.open();
        await this.keyValueStore.setValue(key, value, options);
    }

    private async open(storeName: string = scanResultStorageName): Promise<void> {
        if (this.keyValueStore === undefined) {
            this.keyValueStore = await this.apifyObj.openKeyValueStore(storeName);
        }
    }
}
