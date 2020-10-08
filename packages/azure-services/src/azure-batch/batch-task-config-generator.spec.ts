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

const appInsightsKey = 'appInsightsKeyEnvValue';
const keyVaultUrl = 'keyVaultUrlEnvValue';
const taskRuntimeConfig: TaskRuntimeConfig = {
    maxTaskRetryCount: 3,
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
        environmentSettingsMock.setup((s) => s.getValue('APPINSIGHTS_INSTRUMENTATIONKEY')).returns(() => appInsightsKey);
        environmentSettingsMock.setup((s) => s.getValue('KEY_VAULT_URL')).returns(() => keyVaultUrl);

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
            "--init --rm --workdir / -e APPINSIGHTS_INSTRUMENTATIONKEY -e KEY_VAULT_URL -e TASK_ARGUMENTS -e arg1='arg1Value' -e arg2='arg2Value' -e arg3='arg3Value' --addon option",
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
            commandLine: '',
            resourceFiles: [
                {
                    autoStorageContainerName: 'containerName',
                },
            ],
            environmentSettings: expectedEnvironmentSettings,
            containerSettings: {
                imageName: 'allyContainerRegistry.azurecr.io/imageNameValue',
                containerRunOptions:
                    "--init --rm --workdir / -e APPINSIGHTS_INSTRUMENTATIONKEY -e KEY_VAULT_URL -e TASK_ARGUMENTS -e arg1='arg1Value' -e arg2='arg2Value' -e arg3='arg3Value' --addon option",
            },
            constraints: {
                maxWallClockTime: `PT${taskRuntimeConfig.taskTimeoutInMinutes}M`,
                retentionTime: `P${taskRuntimeConfig.retentionTimeInDays}D`,
                maxTaskRetryCount: taskRuntimeConfig.maxTaskRetryCount,
            },
        };

        const actualTaskConfig = await testSubject.getTaskConfigWithImageSupport('batchAccountName', 'taskId', taskArgsString);
        expect(actualTaskConfig).toEqual(expectedTaskConfig);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function getEnvironmentSettings(taskArgsString: string): any[] {
        return [
            {
                name: 'APPINSIGHTS_INSTRUMENTATIONKEY',
                value: appInsightsKey,
            },
            {
                name: 'KEY_VAULT_URL',
                value: keyVaultUrl,
            },
            {
                name: 'TASK_ARGUMENTS',
                value: taskArgsString,
            },
        ];
    }
});
