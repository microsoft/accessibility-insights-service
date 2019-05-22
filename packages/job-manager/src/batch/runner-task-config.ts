import { BatchServiceModels } from '@azure/batch';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { loggerTypes, StringUtils } from 'logger';
// tslint:disable: no-unsafe-any no-any

@injectable()
export class RunnerTaskConfig {
    public readonly commandLineTemplate: string =
        '/bin/bash -c \'start-runner.sh "%id%" "%name%" "%baseUrl%" "%scanUrl%" "%serviceTreeId%"\'';
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

    private environmentSettings: BatchServiceModels.EnvironmentSetting[];

    constructor(@inject(loggerTypes.Process) private readonly currentProcess: typeof process) {}

    public getCommandLine(data: any): string {
        return this.commandLineTemplate.replace(/%(\w*)%/g, (match, key) => (data.hasOwnProperty(key) ? data[key] : ''));
    }

    public getEnvironmentSettings(): BatchServiceModels.EnvironmentSetting[] {
        if (isEmpty(this.environmentSettings)) {
            this.environmentSettings = [];
            this.environmentSettingsTemplate.forEach(setting => {
                const value = StringUtils.isNullOrEmptyString(setting.value) ? this.currentProcess.env[setting.name] : setting.value;
                if (StringUtils.isNullOrEmptyString(value)) {
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
            ];
        }

        return this.resourceFiles;
    }
}
