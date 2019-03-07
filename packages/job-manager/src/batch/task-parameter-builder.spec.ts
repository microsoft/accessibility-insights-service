import { TaskParameterBuilder } from './task-parameter-builder';

describe(TaskParameterBuilder, () => {
    let taskParameterBuilder: TaskParameterBuilder;

    it('build command line', () => {
        const parameter = {
            commandLineTemplate: '--arg1:%arg1% --arg2:%arg2% --arg3:%arg3%',
        };
        const data = { arg1: 'val1', arg2: 'val2', arg3: 'val3', arg4: 'val4' };

        taskParameterBuilder = new TaskParameterBuilder(JSON.stringify(parameter));
        const commandLine = taskParameterBuilder.getCommandLine(data);

        expect(commandLine).toEqual('--arg1:val1 --arg2:val2 --arg3:val3');
    });

    it('parse task parameter JSON', () => {
        const parameter = {
            resourceFiles: [
                {
                    httpUrl: 'httpUrl',
                    filePath: 'filePath',
                },
            ],
            environmentSettings: [
                {
                    name: 'name',
                    value: 'value',
                },
            ],
            commandLineTemplate: 'commandLineTemplate',
        };

        taskParameterBuilder = new TaskParameterBuilder(JSON.stringify(parameter));

        expect(taskParameterBuilder.resourceFiles).toEqual(parameter.resourceFiles);
        expect(taskParameterBuilder.environmentSettings).toEqual(parameter.environmentSettings);
        expect(taskParameterBuilder.commandLineTemplate).toEqual(parameter.commandLineTemplate);
    });
});
