import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { BatchConfig } from './batch-config';
import { TaskParameterBuilder } from './task-parameter-builder';

describe(TaskParameterBuilder, () => {
    let batchConfigMock: IMock<BatchConfig>;
    let taskParameter: string;
    beforeEach(() => {
        batchConfigMock = Mock.ofType(BatchConfig);

        batchConfigMock.setup(b => b.taskParameter).returns(() => taskParameter);
    });

    it('build command line', () => {
        const parameter = {
            commandLineTemplate: '--arg1:%arg1% --arg2:%arg2% --arg3:%arg3%',
        };
        const data = { arg1: 'val1', arg2: 'val2', arg3: 'val3', arg4: 'val4' };

        const testSubject = createTaskParameterBuilder(parameter);
        const commandLine = testSubject.getCommandLine(data);

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

        const testSubject = createTaskParameterBuilder(parameter);

        expect(testSubject.resourceFiles).toEqual(parameter.resourceFiles);
        expect(testSubject.environmentSettings).toEqual(parameter.environmentSettings);
        expect(testSubject.commandLineTemplate).toEqual(parameter.commandLineTemplate);
    });

    function createTaskParameterBuilder(taskParameterJsonObj: object): TaskParameterBuilder {
        taskParameter = JSON.stringify(taskParameterJsonObj);

        return new TaskParameterBuilder(batchConfigMock.object);
    }
});
