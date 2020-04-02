// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { BatchServiceModels } from '@azure/batch';
import { TaskRuntimeConfig } from 'common';
import { IMock, Mock, Times } from 'typemoq';
import { BatchTaskConfigGenerator } from './batch-task-config-generator';
import { BatchTaskPropertyProvider } from './batch-task-property-provider';

// tslint:disable: no-object-literal-type-assertion no-any no-unsafe-any

class BatchTaskPropertyProviderStub extends BatchTaskPropertyProvider {
    protected getEnvironmentSettings(): BatchServiceModels.EnvironmentSetting[] {
        throw new Error('Method not implemented.');
    }

    protected getResourceContainerNames(): string[] {
        throw new Error('Method not implemented.');
    }
}

describe(BatchTaskConfigGenerator, () => {
    let batchTaskPropertyProviderMock: IMock<BatchTaskPropertyProvider>;
    let testSubject: BatchTaskConfigGenerator;

    beforeEach(() => {
        batchTaskPropertyProviderMock = Mock.ofType(BatchTaskPropertyProviderStub);
        testSubject = new BatchTaskConfigGenerator(batchTaskPropertyProviderMock.object);
    });

    it('generates task config', async () => {
        const taskId = 'task id1';
        const message = 'message1';

        const commandLine = 'command line1';
        const environmentSettings = 'environment settings1' as any;
        const resourceFiles = 'resource files1' as any;
        const defaultTaskConfig: TaskRuntimeConfig = { taskTimeoutInMinutes: 2, exitOnComplete: false };

        batchTaskPropertyProviderMock
            .setup((s) => s.getCommandLine(message))
            .returns(() => commandLine)
            .verifiable(Times.once());
        batchTaskPropertyProviderMock
            .setup((s) => s.getAllEnvironmentSettings(message))
            .returns(() => environmentSettings)
            .verifiable(Times.once());

        batchTaskPropertyProviderMock
            .setup((s) => s.getResourceFiles())
            .returns(() => resourceFiles)
            .verifiable(Times.once());

        batchTaskPropertyProviderMock
            .setup(async (s) => s.getDefaultTaskConfig())
            .returns(async () => defaultTaskConfig)
            .verifiable(Times.once());

        const taskConfig = await testSubject.getTaskConfig(taskId, message);

        expect(taskConfig).toMatchSnapshot();
    });

    afterEach(() => {
        batchTaskPropertyProviderMock.verifyAll();
    });
});
