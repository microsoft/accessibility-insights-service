// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BatchServiceModels } from '@azure/batch';
import { ServiceConfiguration, TaskRuntimeConfig } from 'common';
import { inject, injectable, unmanaged } from 'inversify';
import { cloneDeep } from 'lodash';

@injectable()
export abstract class BatchTaskPropertyProvider {
    private readonly taskArgumentsValueName = 'TASK_ARGUMENTS';

    constructor(
        @inject(ServiceConfiguration)
        protected readonly serviceConfig: ServiceConfiguration,
        @unmanaged()
        protected readonly scriptToInvoke: string,
        @unmanaged()
        protected readonly commandLineParameters: string[],
    ) {}

    public getCommandLine(taskArgsString: string): string {
        const taskArgs = JSON.parse(taskArgsString) as { [key: string]: string };

        return this.getCommandLineTemplate().replace(/%(\w*)%/g, (match, key: string) =>
            taskArgs.hasOwnProperty(key) ? taskArgs[key] : '',
        );
    }

    public getAllEnvironmentSettings(taskArgs: string): BatchServiceModels.EnvironmentSetting[] {
        const taskArguments = { name: this.taskArgumentsValueName, value: taskArgs };
        const environmentSettingsCopy = cloneDeep(this.getEnvironmentSettings());
        environmentSettingsCopy.push(taskArguments);

        return environmentSettingsCopy;
    }

    public getResourceFiles(): BatchServiceModels.ResourceFile[] {
        const resourceFiles: BatchServiceModels.ResourceFile[] = [];

        const containerNames = this.getResourceContainerNames();

        containerNames.forEach(containerName => {
            resourceFiles.push({
                autoStorageContainerName: containerName,
            });
        });

        return resourceFiles;
    }

    public async getDefaultTaskConfig(): Promise<TaskRuntimeConfig> {
        return this.serviceConfig.getConfigValue('taskConfig');
    }

    protected abstract getEnvironmentSettings(): BatchServiceModels.EnvironmentSetting[];

    protected abstract getResourceContainerNames(): string[];

    private getCommandLineTemplate(): string {
        let argsPlaceHolders = '';

        this.commandLineParameters.forEach(p => {
            argsPlaceHolders += ` "%${p}%"`;
        });

        return `/bin/bash -c \'${this.scriptToInvoke}${argsPlaceHolders}\'`;
    }
}
