// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { inject, injectable, optional } from 'inversify';
import { iocTypes } from '../types/ioc-types';
import { BlobStore, scanResultStorageName } from './store-types';

@injectable()
export class LocalBlobStore implements BlobStore {
    constructor(
        @inject(iocTypes.ApifyKeyValueStore) @optional() private keyValueStore?: Apify.KeyValueStore,
        private readonly apifyObj: typeof Apify = Apify,
    ) {}

    // eslint-disable-next-line @typescript-eslint/ban-types
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
