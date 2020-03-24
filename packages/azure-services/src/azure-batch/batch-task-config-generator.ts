// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BatchServiceModels } from '@azure/batch';
import { inject, injectable } from 'inversify';
import * as moment from 'moment';
import { BatchTaskPropertyProvider } from './batch-task-property-provider';

@injectable()
export class BatchTaskConfigGenerator {
    public constructor(@inject(BatchTaskPropertyProvider) protected readonly batchTaskCommandLineProvider: BatchTaskPropertyProvider) {}

    public async getTaskConfig(taskId: string, messageText: string): Promise<BatchServiceModels.TaskAddParameter> {
        const commandLine = this.batchTaskCommandLineProvider.getCommandLine(messageText);
        const maxTaskDurationInMinutes = (await this.batchTaskCommandLineProvider.getDefaultTaskConfig()).taskTimeoutInMinutes;

        return {
            id: taskId,
            commandLine: commandLine,
            resourceFiles: this.batchTaskCommandLineProvider.getResourceFiles(),
            environmentSettings: this.batchTaskCommandLineProvider.getAllEnvironmentSettings(messageText),
            constraints: { maxWallClockTime: moment.duration({ minute: maxTaskDurationInMinutes }).toISOString() },
        };
    }
}
