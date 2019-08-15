// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { GetReportController } from '../src/controllers/get-report-controller';

export async function run(context: Context): Promise<void> {
    const controller = new GetReportController(context);
    controller.invoke();
}
