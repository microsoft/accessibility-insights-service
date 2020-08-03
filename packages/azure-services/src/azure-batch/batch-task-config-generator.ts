// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BatchServiceModels } from '@azure/batch';
import { EnvironmentSettings, ServiceConfiguration, TaskRuntimeConfig } from 'common';
import { inject, injectable } from 'inversify';
import { cloneDeep } from 'lodash';
import * as moment from 'moment';

@injectable()
export abstract class BatchTaskPropertyProvider {
    public abstract async getImageName(): Promise<string>;
}

@injectable()
export class BatchTaskConfigGenerator {
    // The TASK_ARGUMENTS environment variable is used by batch processor to access task run arguments
    private readonly taskArgsValueName = 'TASK_ARGUMENTS';
    private readonly appInsightKeyValueName = 'APPINSIGHTS_INSTRUMENTATIONKEY';
    private readonly keyVaultUrlValueName = 'KEY_VAULT_URL';

    // The --rm container option removes the container after the task finishes
    // The --workdir container option defines task working directory
    private readonly containerRunOptions = '--rm --workdir /';

    public constructor(
        @inject(BatchTaskPropertyProvider) protected readonly batchTaskPropertyProvider: BatchTaskPropertyProvider,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(EnvironmentSettings) private readonly environmentSettings: EnvironmentSettings,
    ) {}

    public async getTaskConfigWithImageSupport(
        accountName: string,
        taskId: string,
        messageText: string,
    ): Promise<BatchServiceModels.TaskAddParameter> {
        const environmentSettings = this.getEnvironmentSettings(messageText);
        const containerRunOptions = this.getContainerRunOptions(messageText, environmentSettings);
        const imageName = await this.getFullImageName(accountName);
        const batchTaskConfig = await this.getDefaultTaskConfig();

        return {
            id: taskId,
            commandLine: '',
            environmentSettings,
            containerSettings: {
                imageName,
                containerRunOptions,
            },
            constraints: {
                maxWallClockTime: moment.duration({ minute: batchTaskConfig.taskTimeoutInMinutes }).toISOString(),
                retentionTime: moment.duration({ day: batchTaskConfig.retentionTimeInDays }).toISOString(),
                maxTaskRetryCount: batchTaskConfig.maxTaskRetryCount,
            },
        };
    }

    public getContainerRunOptions(taskArgsString: string, environmentSettings: BatchServiceModels.EnvironmentSetting[]): string {
        const runArgsOptions = this.createRunArgsOptions(taskArgsString);
        const environmentVariableOptions = this.createEnvironmentVariableOptions(environmentSettings);

        return `${this.containerRunOptions} ${environmentVariableOptions} ${runArgsOptions}`;
    }

    public getEnvironmentSettings(taskArgs: string): BatchServiceModels.EnvironmentSetting[] {
        const taskArguments = { name: this.taskArgsValueName, value: taskArgs };
        const environmentSettingsCopy = cloneDeep(this.getHostEnvironmentSettings());
        environmentSettingsCopy.push(taskArguments);

        return environmentSettingsCopy;
    }

    public async getFullImageName(accountName: string): Promise<string> {
        const containerRegistryName = this.serviceConfig.getAzureResourceName('batch', accountName, 'registry');
        const imageName = await this.batchTaskPropertyProvider.getImageName();

        return `${containerRegistryName}.azurecr.io/${imageName}`;
    }

    private createRunArgsOptions(taskArgsString: string): string {
        let options = '';
        const taskArgs = JSON.parse(taskArgsString) as { [key: string]: string };
        Object.keys(taskArgs).forEach((arg) => (options += `-e ${arg}='${taskArgs[arg]}' `));

        return options.trimRight();
    }

    private createEnvironmentVariableOptions(environmentSettings: BatchServiceModels.EnvironmentSetting[]): string {
        let options = '';
        // To pass environment variable from host to container valur should be empty
        environmentSettings.forEach((env) => (options += `-e ${env.name} `));

        return options.trimRight();
    }

    private getHostEnvironmentSettings(): BatchServiceModels.EnvironmentSetting[] {
        return [
            {
                name: this.appInsightKeyValueName,
                value: this.environmentSettings.getValue(this.appInsightKeyValueName),
            },
            {
                name: this.keyVaultUrlValueName,
                value: this.environmentSettings.getValue(this.keyVaultUrlValueName),
            },
        ];
    }

    private async getDefaultTaskConfig(): Promise<TaskRuntimeConfig> {
        return this.serviceConfig.getConfigValue('taskConfig');
    }
}
