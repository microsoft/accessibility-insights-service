// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';

export async function run(context: Context): Promise<void> {
    context.res = {
        status: 200,
    };
    context.done();
}
