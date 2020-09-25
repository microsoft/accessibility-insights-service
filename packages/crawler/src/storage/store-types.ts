// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export const scanResultStorageName = 'scan-results';

export interface DataStore {
    pushData(data: unknown): Promise<void>;
}

export interface BlobStore {
    setValue(
        key: string,
        // eslint-disable-next-line @typescript-eslint/ban-types
        value: string | Object,
        options?:
            | {
                  contentType?: string;
              }
            | undefined,
    ): Promise<void>;
}
