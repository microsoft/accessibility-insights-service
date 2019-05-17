import { BatchServiceModels } from '@azure/batch';
import { inject, injectable } from 'inversify';
import { BatchConfig } from './batch-config';
// tslint:disable: no-unsafe-any no-any

@injectable()
export class TaskParameterBuilder {
    public readonly resourceFiles?: BatchServiceModels.ResourceFile[];
    public readonly environmentSettings?: BatchServiceModels.EnvironmentSetting[];
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
