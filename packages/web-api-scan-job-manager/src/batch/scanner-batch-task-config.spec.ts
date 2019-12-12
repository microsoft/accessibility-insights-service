// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { BatchServiceModels } from '@azure/batch';
import { ScannerBatchTaskConfig } from './scanner-batch-task-config';
// tslint:disable: no-object-literal-type-assertion

describe(ScannerBatchTaskConfig, () => {
    let testSubject: ScannerBatchTaskConfig;
    let processStub: NodeJS.Process;
    const appInsightsKey = 'app insights key1';
    const keyVaultUrl = 'key vault url1';
    const runnerScriptContainerName = 'runner script container';

    beforeEach(() => {
        processStub = {
            env: {
                APPINSIGHTS_INSTRUMENTATIONKEY: appInsightsKey,
                KEY_VAULT_URL: keyVaultUrl,
                RUNNER_SCRIPTS_CONTAINER_NAME: runnerScriptContainerName,
            } as NodeJS.ProcessEnv,
        } as NodeJS.Process;

        testSubject = new ScannerBatchTaskConfig(processStub);
    });

    it('builds command line', () => {
        const data = { id: 'id1', url: 'url1', priority: 1 };

        const commandLine = testSubject.getCommandLine(data);

        expect(commandLine).toEqual('/bin/bash -c \'start-web-api-scan-runner.sh "id1" "url1" 1\'');
    });

    it('returns resourceFiles', () => {
        expect(testSubject.getResourceFiles()).toEqual([
            {
                autoStorageContainerName: runnerScriptContainerName,
            },
            {
                autoStorageContainerName: 'runtime-configuration',
            },
        ] as BatchServiceModels.ResourceFile[]);
    });

    describe('environment settings', () => {
        it('builds environment settings', () => {
            const envSettings = testSubject.getEnvironmentSettings();

            expect(envSettings).toEqual([
                {
                    name: 'APPINSIGHTS_INSTRUMENTATIONKEY',
                    value: appInsightsKey,
                },
                {
                    name: 'KEY_VAULT_URL',
                    value: keyVaultUrl,
                },
            ] as typeof envSettings);
        });

        it('throw if environment variable not set', () => {
            delete processStub.env.KEY_VAULT_URL;
            expect(() => testSubject.getEnvironmentSettings()).toThrowError('Unable to get environment property value for KEY_VAULT_URL');
        });
    });
});
