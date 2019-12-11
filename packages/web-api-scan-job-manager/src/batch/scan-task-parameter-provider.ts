// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BatchServiceModels } from '@azure/batch';
import { BatchTaskParameterProvider } from 'azure-services';
import { ServiceConfiguration, TaskRuntimeConfig } from 'common';
import { inject, injectable } from 'inversify';
import * as moment from 'moment';
import { RunnerTaskConfig } from './runner-task-config';

@injectable()
export class ScanTaskParameterProvider implements BatchTaskParameterProvider {
    public constructor(
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(RunnerTaskConfig) private readonly runnerTaskConfig: RunnerTaskConfig,
    ) {}

    public async getTaskParameter(taskId: string, messageText: string): Promise<BatchServiceModels.TaskAddParameter> {
        const message = JSON.parse(messageText);
        const commandLine = this.runnerTaskConfig.getCommandLine(message);
        const maxTaskDurationInMinutes = (await this.getTaskConfig()).taskTimeoutInMinutes;

        return {
            id: taskId,
            commandLine: commandLine,
            resourceFiles: this.runnerTaskConfig.getResourceFiles(),
            environmentSettings: this.runnerTaskConfig.getEnvironmentSettings(),
            constraints: { maxWallClockTime: moment.duration({ minute: maxTaskDurationInMinutes }).toISOString() },
        };
    }

    private async getTaskConfig(): Promise<TaskRuntimeConfig> {
        return this.serviceConfig.getConfigValue('taskConfig');
    }
}
