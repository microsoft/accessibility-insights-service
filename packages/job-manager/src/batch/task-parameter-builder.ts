import { ResourceFile, EnvironmentSetting } from "azure-batch/lib/models";

export class TaskParameterBuilder {
    public readonly resourceFiles?: ResourceFile[];
    public readonly environmentSettings?: EnvironmentSetting[];
    public readonly commandLineTemplate: string;

    constructor(public taskParameter: string) {
        const taskParameterObj = JSON.parse(this.taskParameter);
        this.resourceFiles = taskParameterObj.resourceFiles;
        this.environmentSettings = taskParameterObj.environmentSettings;
        this.commandLineTemplate = taskParameterObj.commandLineTemplate;
    }

    public getCommandLine(data: any): string {
        return this.commandLineTemplate.replace(/%(\w*)%/g, (match, key) => data.hasOwnProperty(key) ? data[key] : '');
    }
}
