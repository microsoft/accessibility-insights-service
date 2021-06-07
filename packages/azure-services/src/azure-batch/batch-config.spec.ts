// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { BatchConfig } from './batch-config';

describe(BatchConfig, () => {
    let batchConfig: BatchConfig;

    it('returns config set in environment variables', () => {
        process.env.AZ_BATCH_ACCOUNT_NAME = 'test account name';
        process.env.AZ_BATCH_ACCOUNT_URL = 'test account url';
        process.env.AZ_BATCH_POOL_ID = 'pool id';
        process.env.AZ_BATCH_JOB_ID = 'job id';
        process.env.AZ_BATCH_TASK_WORKING_DIR = 'task working directory';
        batchConfig = new BatchConfig();

        expect(batchConfig.accountName).toEqual(process.env.AZ_BATCH_ACCOUNT_NAME);
        expect(batchConfig.accountUrl).toEqual(process.env.AZ_BATCH_ACCOUNT_URL);
        expect(batchConfig.poolId).toEqual(process.env.AZ_BATCH_POOL_ID);
        expect(batchConfig.jobId).toEqual(process.env.AZ_BATCH_JOB_ID);
        expect(batchConfig.taskWorkingDir).toEqual(process.env.AZ_BATCH_TASK_WORKING_DIR);
    });
});
