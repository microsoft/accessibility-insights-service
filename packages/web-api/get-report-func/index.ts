// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ReportController } from '../src/controllers/report-controller';

export async function run(context: Context): Promise<void> {
    const controller = new ReportController(context);
    if (controller.validateRequest()) {
        controller.getReport();
    }
}
