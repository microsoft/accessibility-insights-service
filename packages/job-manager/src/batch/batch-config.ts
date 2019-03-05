export class BatchConfig {
    public readonly accountKey: string = process.env.AZ_BATCH_ACCOUNT_KEY;
    public readonly accountName: string = process.env.AZ_BATCH_ACCOUNT_NAME;
    public readonly accountUrl: string = process.env.AZ_BATCH_ACCOUNT_URL;
    public readonly poolId: string = process.env.AZ_BATCH_POOL_ID;

    public get taskParameter(): string {
        if (process.env.AZ_BATCH_TASK_PARAMETER) {
            return Buffer.from(process.env.AZ_BATCH_TASK_PARAMETER, 'base64').toString();
        } else {
            return null;
        }
    }
}

export let batchConfig = new BatchConfig();
