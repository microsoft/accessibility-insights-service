import { Context } from '@azure/functions';
import { ScanRequest } from './scan-request';
export async function run(context: Context, sendTrigger: object, scanRequest: ScanRequest[]): Promise<void> {
    context.log('received scan-request for websites ', scanRequest[0].websites.length);
    context.bindings.outputQueueItem = scanRequest[0].websites;
}
