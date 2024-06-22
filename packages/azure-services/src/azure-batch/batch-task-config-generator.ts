// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BatchServiceModels } from '@azure/batch';
import { EnvironmentSettings, ServiceConfiguration, TaskRuntimeConfig } from 'common';
import { inject, injectable } from 'inversify';
import { cloneDeep } from 'lodash';
import moment from 'moment';

export declare type UserAccessLevels = 'admin' | 'nonadmin';

export interface BatchTaskPropertyProvider {
    getResourceFiles?(): BatchServiceModels.ResourceFile[];
    getAdditionalContainerRunOptions?(): string;
}

@injectable()
export abstract class BatchTaskPropertyProvider {
    public abstract getImageName(): Promise<string>;

    public getAdditionalContainerRunOptions?(): string {
        return '';
    }

    public getResourceFiles?(): BatchServiceModels.ResourceFile[] {
        return [];
    }

    public getUserElevationLevel(): UserAccessLevels {
        return 'admin';
    }
}

@injectable()
export class BatchTaskConfigGenerator {
    // The TASK_ARGUMENTS environment variable is used by batch processor to access task run arguments
    private readonly taskArgsValueName = 'TASK_ARGUMENTS';

    private readonly appInsightKeyValueName = 'APPINSIGHTS_INSTRUMENTATIONKEY';

    // The --rm option removes the container after the task finishes
    // The --cpus option limits container to use number of CPUs on host VM
    // The --workdir option defines task working directory
    // The --init option reaps zombie processes
    // The --shm-size option increases shared memory allocated to a container
    // The -v option mounts D: drive in container
    private readonly containerRunOptions =
        '--init --rm --cpus=2 --shm-size=2gb --workdir /app -v d: --env-file %AZ_BATCH_TASK_WORKING_DIR%\\.env';

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
        const resourceFiles = this.batchTaskPropertyProvider.getResourceFiles();

        return {
            id: taskId,
            commandLine: `cmd /c "powershell.exe %AZ_BATCH_NODE_STARTUP_WORKING_DIR%\\prepare-run.ps1 && docker run ${containerRunOptions} ${imageName}"`,
            environmentSettings,
            resourceFiles,
            constraints: {
                maxWallClockTime: moment.duration({ minute: batchTaskConfig.taskTimeoutInMinutes }).toISOString(),
                retentionTime: moment.duration({ day: batchTaskConfig.retentionTimeInDays }).toISOString(),
                maxTaskRetryCount: 0,
            },
            userIdentity: {
                autoUser: {
                    scope: 'task',
                    elevationLevel: this.batchTaskPropertyProvider.getUserElevationLevel(),
                },
            },
        };
    }

    public getContainerRunOptions(taskArgsString: string, environmentSettings: BatchServiceModels.EnvironmentSetting[]): string {
        const runArgsOptions = this.createRunArgsOptions(taskArgsString);
        const environmentVariableOptions = this.createEnvironmentVariableOptions(environmentSettings);
        const containerRunOptions = `${
            this.containerRunOptions
        } ${environmentVariableOptions} ${runArgsOptions} ${this.batchTaskPropertyProvider.getAdditionalContainerRunOptions()}`;

        return containerRunOptions.trimEnd();
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
        // encode parameters to pass into docker hosted process
        Object.keys(taskArgs).forEach((arg) => (options += `-e ${arg}=${encodeURIComponent(taskArgs[arg])} `));

        return options.trimEnd();
    }

    private createEnvironmentVariableOptions(environmentSettings: BatchServiceModels.EnvironmentSetting[]): string {
        let options = '';
        // To pass environment variable from host to container value should be empty
        environmentSettings.forEach((env) => (options += `-e ${env.name} `));

        return options.trimEnd();
    }

    private getHostEnvironmentSettings(): BatchServiceModels.EnvironmentSetting[] {
        return [
            {
                name: this.appInsightKeyValueName,
                value: this.environmentSettings.getValue(this.appInsightKeyValueName),
            },
        ];
    }

    private async getDefaultTaskConfig(): Promise<TaskRuntimeConfig> {
        return this.serviceConfig.getConfigValue('taskConfig');
    }
}
