import { Context } from '@azure/functions';

import { ScanRequest } from './scan-request';

export function setOutputQueueItem(context: Context, scanRequest: ScanRequest[]): void {
    context.log('received scan-request for websites ', scanRequest[0].websites.length);
    context.bindings.outputQueueItem = scanRequest[0].websites;
}
