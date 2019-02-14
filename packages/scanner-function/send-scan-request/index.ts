import { Context } from '@azure/functions';
import * as appInsights from 'applicationinsights';

import { createTelemetryClient } from '../common/create-telemetry-client';
import { ScanRequest } from './scan-request';
import { setOutputQueueItem } from './set-output-queue-item';

export async function run(context: Context, sendTrigger: object, scanRequest: ScanRequest[]): Promise<void> {
    createTelemetryClient(context, appInsights);
    setOutputQueueItem(context, scanRequest);
}
