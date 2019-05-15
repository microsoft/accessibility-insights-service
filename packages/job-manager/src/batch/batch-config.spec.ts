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

    it('decode AZ_BATCH_TASK_PARAMETER environment variable', () => {
        const value: string = `value-${new Date().valueOf()}`;
        process.env.AZ_BATCH_TASK_PARAMETER = Buffer.from(value).toString('base64');
        batchConfig = new BatchConfig();

        expect(batchConfig.taskParameter).toEqual(value);
    });
});
