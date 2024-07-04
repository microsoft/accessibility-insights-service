// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Context } from '@azure/functions';

export async function run(context: Context): Promise<void> {
    context.res = {
        status: 500,
    };
    context.done();
}
