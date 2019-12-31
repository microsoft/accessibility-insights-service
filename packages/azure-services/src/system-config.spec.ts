// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { SystemConfig } from './system-config';

describe(SystemConfig, () => {
    let systemConfig: SystemConfig;

    it('return environment variables', () => {
        process.env.AZURE_STORAGE_NAME = 'scan-name';
        process.env.AZURE_STORAGE_SCAN_QUEUE = 'storage-scan-queue';
        process.env.AZ_BATCH_ACCOUNT_NAME = 'batch-account-name';
        systemConfig = new SystemConfig();

        expect(systemConfig.storageName).toEqual(process.env.AZURE_STORAGE_NAME);
        expect(systemConfig.scanQueue).toEqual(process.env.AZURE_STORAGE_SCAN_QUEUE);
        expect(systemConfig.batchAccountName).toEqual(process.env.AZ_BATCH_ACCOUNT_NAME);
    });
});
