// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { InvocationContext } from '@azure/functions';

export async function run(context: InvocationContext): Promise<void> {
    context.res = {
        status: 500,
    };
    context.done();
}
