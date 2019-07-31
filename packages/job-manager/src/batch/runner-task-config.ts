// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BatchServiceModels } from '@azure/batch';
import { System } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { loggerTypes } from 'logger';

@injectable()
export class RunnerTaskConfig {
    public readonly commandLineTemplate: string =
        '/bin/bash -c \'start-runner.sh "%websiteId%" "%name%" "%baseUrl%" "%url%" "%serviceTreeId%"\'';

    private environmentSettings: BatchServiceModels.EnvironmentSetting[];
    private resourceFiles: BatchServiceModels.ResourceFile[];
    private readonly environmentSettingsTemplate: BatchServiceModels.EnvironmentSetting[] = [
        {
            name: 'APPINSIGHTS_INSTRUMENTATIONKEY',
            value: '',
        },
        {
            name: 'KEY_VAULT_URL',
            value: '',
        },
    ];

    constructor(@inject(loggerTypes.Process) private readonly currentProcess: typeof process) {}

    // tslint:disable-next-line: no-any
    public getCommandLine(data: any): string {
        // tslint:disable-next-line: no-unsafe-any
        return this.commandLineTemplate.replace(/%(\w*)%/g, (match, key) => (data.hasOwnProperty(key) ? data[key] : ''));
    }

    public getEnvironmentSettings(): BatchServiceModels.EnvironmentSetting[] {
        if (isEmpty(this.environmentSettings)) {
            this.environmentSettings = [];
            this.environmentSettingsTemplate.forEach(setting => {
                const value = System.isNullOrEmptyString(setting.value) ? this.currentProcess.env[setting.name] : setting.value;
                if (System.isNullOrEmptyString(value)) {
                    throw new Error(`Unable to get environment property value for ${setting.name}`);
                }

                this.environmentSettings.push({
                    name: setting.name,
                    value: this.currentProcess.env[setting.name],
                });
            });
        }

        return this.environmentSettings;
    }

    public getResourceFiles(): BatchServiceModels.ResourceFile[] {
        if (isEmpty(this.resourceFiles)) {
            this.resourceFiles = [
                {
                    autoStorageContainerName: this.currentProcess.env.RUNNER_SCRIPTS_CONTAINER_NAME,
                },
                {
                    autoStorageContainerName: 'runtime-configuration',
                },
            ];
        }

        return this.resourceFiles;
    }
}
