// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BatchServiceModels } from '@azure/batch';
import { BatchTaskParameterProvider } from 'azure-services';
import { ServiceConfiguration, TaskRuntimeConfig } from 'common';
import { inject, injectable } from 'inversify';
import { cloneDeep } from 'lodash';
import * as moment from 'moment';
import { ScannerBatchTaskConfig } from './scanner-batch-task-config';

@injectable()
export class ScanTaskParameterProvider implements BatchTaskParameterProvider {
    private readonly taskArgumentsValueName = 'TASK_ARGUMENTS';

    public constructor(
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(ScannerBatchTaskConfig) private readonly runnerTaskConfig: ScannerBatchTaskConfig,
    ) {}

    public async getTaskParameter(taskId: string, messageText: string): Promise<BatchServiceModels.TaskAddParameter> {
        const message = JSON.parse(messageText);
        const commandLine = this.runnerTaskConfig.getCommandLine(message);
        const maxTaskDurationInMinutes = (await this.getTaskConfig()).taskTimeoutInMinutes;
        const environmentSettings = this.runnerTaskConfig.getEnvironmentSettings();
        const environmentSettingsWithArguments = this.setTaskArgumentsValue(environmentSettings, messageText);

        return {
            id: taskId,
            commandLine: commandLine,
            resourceFiles: this.runnerTaskConfig.getResourceFiles(),
            environmentSettings: environmentSettingsWithArguments,
            constraints: { maxWallClockTime: moment.duration({ minute: maxTaskDurationInMinutes }).toISOString() },
        };
    }

    private setTaskArgumentsValue(
        environmentSettings: BatchServiceModels.EnvironmentSetting[],
        messageText: string,
    ): BatchServiceModels.EnvironmentSetting[] {
        const taskArguments = { name: this.taskArgumentsValueName, value: messageText };
        const environmentSettingsCopy = cloneDeep(environmentSettings);
        environmentSettingsCopy.push(taskArguments);

        return environmentSettingsCopy;
    }

    private async getTaskConfig(): Promise<TaskRuntimeConfig> {
        return this.serviceConfig.getConfigValue('taskConfig');
    }
}
