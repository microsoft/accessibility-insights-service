// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { BlobStore } from './store-types';

export class LocalBlobStore implements BlobStore {
    constructor(public readonly storeName: string, private keyValueStore?: Apify.KeyValueStore) {}

    public async setValue(key: string, value: string | Object, options?: { contentType?: string }): Promise<void> {
        await this.open();
        await this.keyValueStore.setValue(key, value, options);
    }

    private async open(): Promise<void> {
        if (this.keyValueStore === undefined) {
            this.keyValueStore = await Apify.openKeyValueStore(this.storeName);
        }
    }
}
