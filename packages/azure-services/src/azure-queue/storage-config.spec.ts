// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { StorageConfig } from './storage-config';

describe(StorageConfig, () => {
    let storageConfig: StorageConfig;

    it('return value of AZURE_STORAGE_SCAN_QUEUE environment variable', () => {
        const value: string = `value-${new Date().valueOf()}`;
        process.env.AZURE_STORAGE_SCAN_QUEUE = value;
        storageConfig = new StorageConfig();

        expect(storageConfig.scanQueue).toEqual(value);
    });

    it('return value of AZURE_STORAGE_NOTIFICATION_QUEUE environment variable', () => {
        const value: string = `value-${new Date().valueOf()}`;
        process.env.AZURE_STORAGE_NOTIFICATION_QUEUE = value;
        storageConfig = new StorageConfig();

        expect(storageConfig.notificationQueue).toEqual(value);
    });
});
