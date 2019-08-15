// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context, HttpRequest } from '@azure/functions';

export async function run(context: Context, scanRequest: HttpRequest): Promise<void> {
    context.res = { body: 'Reports func' };
    context.log('Scan request received for urls', scanRequest.url);
}
