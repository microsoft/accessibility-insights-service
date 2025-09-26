// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { StorageConfig } from './storage-config';

describe(StorageConfig, () => {
    let storageConfig: StorageConfig;

    it('return value of AI_STORAGE_SCAN_QUEUE environment variable', () => {
        const value: string = `value-${new Date().valueOf()}`;
        process.env.AI_STORAGE_SCAN_QUEUE = value;
        storageConfig = new StorageConfig();

        expect(storageConfig.scanQueue).toEqual(value);
    });

    it('return value of AI_STORAGE_PRIVACY_SCAN_QUEUE environment variable', () => {
        const value: string = `value-${new Date().valueOf()}`;
        process.env.AI_STORAGE_PRIVACY_SCAN_QUEUE = value;
        storageConfig = new StorageConfig();

        expect(storageConfig.privacyScanQueue).toEqual(value);
    });
});
