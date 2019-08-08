// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context } from '@azure/functions';
import { ScanRequest } from './scan-request-type';
export async function run(context: Context, scanRequest: ScanRequest): Promise<void> {
    context.log('Scan request received for urls', scanRequest.urls);
}
