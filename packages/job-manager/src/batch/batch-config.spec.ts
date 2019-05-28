// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { BatchConfig } from './batch-config';

describe(BatchConfig, () => {
    let batchConfig: BatchConfig;

    it('return value of AZ_BATCH_ACCOUNT_NAME environment variable', () => {
        const value: string = `value-${new Date().valueOf()}`;
        process.env.AZ_BATCH_ACCOUNT_NAME = value;
        batchConfig = new BatchConfig();

        expect(batchConfig.accountName).toEqual(value);
    });

    it('return value of AZ_BATCH_ACCOUNT_URL environment variable', () => {
        const value: string = `value-${new Date().valueOf()}`;
        process.env.AZ_BATCH_ACCOUNT_URL = value;
        batchConfig = new BatchConfig();

        expect(batchConfig.accountUrl).toEqual(value);
    });

    it('return value of AZ_BATCH_POOL_ID environment variable', () => {
        const value: string = `value-${new Date().valueOf()}`;
        process.env.AZ_BATCH_POOL_ID = value;
        batchConfig = new BatchConfig();

        expect(batchConfig.poolId).toEqual(value);
    });
});
