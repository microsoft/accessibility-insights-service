// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { BatchServiceModels } from '@azure/batch';
import { ServiceConfiguration } from 'common';
import { IMock, Mock } from 'typemoq';
import { BatchTaskPropertyProvider } from './batch-task-property-provider';

// tslint:disable: no-object-literal-type-assertion no-any

class TestableBatchTaskPropertyProvider extends BatchTaskPropertyProvider {
    constructor(serviceConfig: ServiceConfiguration) {
        super(serviceConfig, 'script1.sh', ['arg1Key', 'arg2Key']);
    }

    public getEnvironmentSettings(): BatchServiceModels.EnvironmentSetting[] {
        return [
            {
                name: 'env1',
                value: 'env1 value',
            },
            {
                name: 'env2',
                value: 'env2 value',
            },
        ];
    }

    protected getResourceContainerNames(): string[] {
        return ['container1', 'container2'];
    }
}

describe(BatchTaskPropertyProvider, () => {
    let testSubject: TestableBatchTaskPropertyProvider;
    let serviceConfig: IMock<ServiceConfiguration>;
    let taskArgs: { [key: string]: string };

    beforeEach(() => {
        serviceConfig = Mock.ofType(ServiceConfiguration);
        testSubject = new TestableBatchTaskPropertyProvider(serviceConfig.object);

        taskArgs = {
            arg1Key: 'arg1 value',
            arg2Key: 'arg2 value',
            someUnknownKey: 'unknown value',
        };
    });

    describe('getCommandLine', () => {
        it('generates command line string', () => {
            expect(testSubject.getCommandLine(JSON.stringify(taskArgs))).toMatchSnapshot();
        });
    });

    describe('getAllEnvironmentSettings', () => {
        it('gets environment settings with task parameters', () => {
            expect(testSubject.getAllEnvironmentSettings(JSON.stringify(taskArgs))).toMatchSnapshot();
        });
    });

    describe('getResourceFiles', () => {
        it('returns resource files', () => {
            expect(testSubject.getResourceFiles()).toMatchSnapshot();
        });
    });

    describe('getTaskConfig', () => {
        it('returns task config', async () => {
            const taskConfig = 'task config' as any;
            serviceConfig.setup(async s => s.getConfigValue('taskConfig')).returns(async () => Promise.resolve(taskConfig));

            await expect(testSubject.getDefaultTaskConfig()).resolves.toBe(taskConfig);
        });
    });
});
