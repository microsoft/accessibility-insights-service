import { Context } from '@azure/functions';
import { ScanRequest } from './scan-request';
// tslint:disable-next-line:no-any
export async function run(context: Context, sendTrigger: any, scanRequest: ScanRequest[]): Promise<void> {
    context.log('received scan-request for websites ', scanRequest[0].websites.length);
    context.bindings.outputQueueItem = scanRequest[0].websites;
}
