import { Context } from '@azure/functions';

export async function run(context: Context, url: string): Promise<void> {
    context.log('JavaScript queue trigger function processed work item', url);
}
