// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import * as _ from 'lodash';

@injectable()
export class BatchConfig {
    public readonly accountName: string = process.env.AZ_BATCH_ACCOUNT_NAME;
    public readonly accountUrl: string = process.env.AZ_BATCH_ACCOUNT_URL;
    public readonly poolId: string = process.env.AZ_BATCH_POOL_ID;
    public readonly jobId: string = process.env.AZ_BATCH_JOB_ID;
}

export const batchConfig = new BatchConfig();
