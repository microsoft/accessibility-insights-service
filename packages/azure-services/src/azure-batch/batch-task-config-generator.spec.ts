// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { BatchServiceModels } from '@azure/batch';
import { EnvironmentSettings, ServiceConfiguration, TaskRuntimeConfig } from 'common';
import { IMock, It, Mock } from 'typemoq';
import { BatchTaskConfigGenerator, BatchTaskPropertyProvider } from './batch-task-config-generator';

class BatchTaskPropertyProviderStub extends BatchTaskPropertyProvider {
    public async getImageName(): Promise<string> {
        return 'imageNameValue';
    }

    public getAdditionalContainerRunOptions?(): string {
        return '--addon option';
    }

    public getResourceFiles?(): BatchServiceModels.ResourceFile[] {
        return [
            {
                autoStorageContainerName: 'containerName',
            },
        ];
    }
}

const appInsightsConnectionString = 'appInsightsConnectionStringValue';
const taskRuntimeConfig: TaskRuntimeConfig = {
    retentionTimeInDays: 1,
    taskTimeoutInMinutes: 5,
};
const taskArgs = {
    arg1: 'arg1Value',
    arg2: 'arg2Value',
    arg3: 'arg3Value',
};

let environmentSettingsMock: IMock<EnvironmentSettings>;
let batchTaskPropertyProviderStub: BatchTaskPropertyProvider;
let serviceConfigMock: IMock<ServiceConfiguration>;
let testSubject: BatchTaskConfigGenerator;

describe(BatchTaskConfigGenerator, () => {
    beforeEach(() => {
        batchTaskPropertyProviderStub = new BatchTaskPropertyProviderStub();

        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock.setup(async (s) => s.getConfigValue('taskConfig')).returns(async () => Promise.resolve(taskRuntimeConfig));
        serviceConfigMock.setup((s) => s.getAzureResourceName('batch', It.isAny(), 'registry')).returns(() => 'allyContainerRegistry');

        environmentSettingsMock = Mock.ofType(EnvironmentSettings);
        environmentSettingsMock
            .setup((s) => s.getValue('APPLICATIONINSIGHTS_CONNECTION_STRING'))
            .returns(() => appInsightsConnectionString);

        testSubject = new BatchTaskConfigGenerator(batchTaskPropertyProviderStub, serviceConfigMock.object, environmentSettingsMock.object);
    });

    afterEach(() => {
        serviceConfigMock.verifyAll();
        environmentSettingsMock.verifyAll();
    });

    it('create container run options', async () => {
        const taskArgsString = JSON.stringify(taskArgs);
        const environmentSettings = getEnvironmentSettings(taskArgsString);
        const actualContainerRunOptions = testSubject.getContainerRunOptions(taskArgsString, environmentSettings);
        expect(actualContainerRunOptions).toEqual(
            '--init --rm --cpus=2 --shm-size=2gb --workdir /app -v d: --env-file %AZ_BATCH_TASK_WORKING_DIR%\\.env -e APPLICATIONINSIGHTS_CONNECTION_STRING -e TASK_ARGUMENTS -e arg1=arg1Value -e arg2=arg2Value -e arg3=arg3Value --addon option',
        );
    });

    it('create container run options with encoded URL', async () => {
        const taskArgsString = JSON.stringify({
            url: 'https://localhost/index.html?param1=value one&id=2',
        });
        const environmentSettings = getEnvironmentSettings(taskArgsString);
        const actualContainerRunOptions = testSubject.getContainerRunOptions(taskArgsString, environmentSettings);
        expect(actualContainerRunOptions).toEqual(
            '--init --rm --cpus=2 --shm-size=2gb --workdir /app -v d: --env-file %AZ_BATCH_TASK_WORKING_DIR%\\.env -e APPLICATIONINSIGHTS_CONNECTION_STRING -e TASK_ARGUMENTS -e url=https%3A%2F%2Flocalhost%2Findex.html%3Fparam1%3Dvalue%20one%26id%3D2 --addon option',
        );
    });

    it('get environment settings', async () => {
        const taskArgsString = JSON.stringify(taskArgs);
        const expectedEnvironmentSettings = getEnvironmentSettings(taskArgsString);
        const actualEnvironmentSettings = testSubject.getEnvironmentSettings(taskArgsString);
        expect(actualEnvironmentSettings).toEqual(expectedEnvironmentSettings);
    });

    it('get image full name', async () => {
        const actualFullImageName = await testSubject.getFullImageName('batchAccountName');
        expect(actualFullImageName).toEqual('allyContainerRegistry.azurecr.io/imageNameValue');
    });

    it('get task config with image support', async () => {
        const taskArgsString = JSON.stringify(taskArgs);
        const expectedEnvironmentSettings = getEnvironmentSettings(taskArgsString);
        const expectedTaskConfig = {
            id: 'taskId',
            commandLine: `cmd /c "powershell.exe %AZ_BATCH_NODE_STARTUP_WORKING_DIR%\\prepare-run.ps1 && docker run --init --rm --cpus=2 --shm-size=2gb --workdir /app -v d: --env-file %AZ_BATCH_TASK_WORKING_DIR%\\.env -e APPLICATIONINSIGHTS_CONNECTION_STRING -e TASK_ARGUMENTS -e arg1=arg1Value -e arg2=arg2Value -e arg3=arg3Value --addon option allyContainerRegistry.azurecr.io/imageNameValue"`,
            resourceFiles: [
                {
                    autoStorageContainerName: 'containerName',
                },
            ],
            environmentSettings: expectedEnvironmentSettings,
            constraints: {
                maxWallClockTime: `PT${taskRuntimeConfig.taskTimeoutInMinutes}M`,
                retentionTime: `P${taskRuntimeConfig.retentionTimeInDays}D`,
                maxTaskRetryCount: 0,
            },
            userIdentity: {
                autoUser: {
                    elevationLevel: 'admin',
                    scope: 'task',
                },
            },
        };

        const actualTaskConfig = await testSubject.getTaskConfigWithImageSupport('batchAccountName', 'taskId', taskArgsString);
        expect(actualTaskConfig).toEqual(expectedTaskConfig);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function getEnvironmentSettings(taskArgsString: string): any[] {
        return [
            {
                name: 'APPLICATIONINSIGHTS_CONNECTION_STRING',
                value: appInsightsConnectionString,
            },

            {
                name: 'TASK_ARGUMENTS',
                value: taskArgsString,
            },
        ];
    }
});
