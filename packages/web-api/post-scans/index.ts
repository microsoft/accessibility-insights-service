// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context, HttpRequest } from '@azure/functions';
import { PostScansController } from '../src/controllers/post-scans-controller';

export async function run(context: Context, request: HttpRequest): Promise<void> {
    const controller = new PostScansController(context);
    controller.invoke();
}
