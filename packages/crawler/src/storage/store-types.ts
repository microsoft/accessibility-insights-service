// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export const scanResultStorageName = 'scan-results';

export interface DataStore {
    pushData(data: unknown): Promise<void>;
}

/* eslint-disable @typescript-eslint/ban-types */
export interface BlobStore {
    setValue(
        key: string,
        value: string | Object,
        options?:
            | {
                  contentType?: string;
              }
            | undefined,
    ): Promise<void>;

    getValue(key: string): Promise<string | Object | Buffer | null>;
}
