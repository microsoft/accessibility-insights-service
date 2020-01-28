// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { BatchServiceModels } from '@azure/batch';
import { ServiceConfiguration, TaskRuntimeConfig } from 'common';
import * as moment from 'moment';
import { IMock, Mock, Times } from 'typemoq';
import { ScanTaskParameterProvider } from './scan-task-parameter-provider';
import { ScannerBatchTaskConfig } from './scanner-batch-task-config';

// tslint:disable: no-object-literal-type-assertion mocha-no-side-effect-code no-any no-unsafe-any

const taskTimeoutInMinutes = 5;
const taskCommandLine = 'commandLine';
const taskResourceFiles = 'resourceFiles' as any;
const taskEnvironmentSettings = [{ name: 'env_name', value: 'env_value' }] as any;
const messageText = JSON.stringify({ scanId: 'scanId-1' });
const taskId = 'id-1';
let scannerBatchTaskConfigMock: IMock<ScannerBatchTaskConfig>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let scanTaskParameterProvider: ScanTaskParameterProvider;

describe(ScanTaskParameterProvider, () => {
    beforeEach(() => {
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async s => s.getConfigValue('taskConfig'))
            .returns(async () => Promise.resolve({ taskTimeoutInMinutes: taskTimeoutInMinutes } as TaskRuntimeConfig))
            .verifiable(Times.once());

        scannerBatchTaskConfigMock = Mock.ofType(ScannerBatchTaskConfig);
        scannerBatchTaskConfigMock
            .setup(o => o.getCommandLine(JSON.parse(messageText)))
            .returns(() => taskCommandLine)
            .verifiable(Times.once());
        scannerBatchTaskConfigMock
            .setup(o => o.getResourceFiles())
            .returns(() => taskResourceFiles)
            .verifiable(Times.once());
        scannerBatchTaskConfigMock
            .setup(o => o.getEnvironmentSettings())
            .returns(() => taskEnvironmentSettings)
            .verifiable(Times.once());

        scanTaskParameterProvider = new ScanTaskParameterProvider(serviceConfigMock.object, scannerBatchTaskConfigMock.object);
    });

    afterEach(() => {
        serviceConfigMock.verifyAll();
        scannerBatchTaskConfigMock.verifyAll();
    });

    it('create task parameter', async () => {
        const expectedTaskParameter: BatchServiceModels.TaskAddParameter = {
            id: taskId,
            commandLine: taskCommandLine,
            resourceFiles: taskResourceFiles,
            environmentSettings: [
                ...taskEnvironmentSettings,
                {
                    name: 'TASK_ARGUMENTS',
                    value: '{"scanId":"scanId-1"}',
                },
            ],
            constraints: { maxWallClockTime: moment.duration({ minute: taskTimeoutInMinutes }).toISOString() },
        };

        const actualTaskParameter = await scanTaskParameterProvider.getTaskParameter(taskId, messageText);

        expect(actualTaskParameter).toEqual(expectedTaskParameter);
    });

    it('create task argument parameter', async () => {
        const actualTaskParameter = await scanTaskParameterProvider.getTaskParameter(taskId, messageText);

        expect(actualTaskParameter.environmentSettings.find(e => e.name === 'TASK_ARGUMENTS').value).toEqual(messageText);
    });
});
