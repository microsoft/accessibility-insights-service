// tslint:disable: no-submodule-imports no-unsafe-any no-any
import { EnvironmentSetting, ResourceFile } from 'azure-batch/lib/models';
import { inject, injectable } from 'inversify';
import { BatchConfig } from './batch-config';

@injectable()
export class TaskParameterBuilder {
    public readonly resourceFiles?: ResourceFile[];
    public readonly environmentSettings?: EnvironmentSetting[];
    public readonly commandLineTemplate: string;

    constructor(@inject(BatchConfig) batchConfig: BatchConfig) {
        const taskParameterObj = JSON.parse(batchConfig.taskParameter);
        this.resourceFiles = taskParameterObj.resourceFiles;
        this.environmentSettings = taskParameterObj.environmentSettings;
        this.commandLineTemplate = taskParameterObj.commandLineTemplate;
    }

    public getCommandLine(data: any): string {
        return this.commandLineTemplate.replace(/%(\w*)%/g, (match, key) => (data.hasOwnProperty(key) ? data[key] : ''));
    }
}
