import { Context } from '@azure/functions';

export async function run(context: Context, myQueueItem: any): Promise<void> {
    context.log('JavaScript queue trigger function processed work item', myQueueItem);
}
