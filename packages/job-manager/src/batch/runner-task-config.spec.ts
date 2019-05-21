import 'reflect-metadata';

import { RunnerTaskConfig } from './runner-task-config';
// tslint:disable: no-object-literal-type-assertion

describe(RunnerTaskConfig, () => {
    let testSubject: RunnerTaskConfig;
    let processStub: NodeJS.Process;
    const appInsightsKey = 'app insights key1';
    const keyVaultUrl = 'key vault url1';

    beforeEach(() => {
        processStub = {
            env: {
                APPINSIGHTS_INSTRUMENTATIONKEY: appInsightsKey,
                KEY_VAULT_URL: keyVaultUrl,
            } as NodeJS.ProcessEnv,
        } as NodeJS.Process;

        testSubject = new RunnerTaskConfig(processStub);
    });

    it('builds command line', () => {
        const data = { id: 'id1', name: 'name1', baseUrl: 'baseUrl1', scanUrl: 'scanUrl1', serviceTreeId: 'serviceTreeId1' };

        const commandLine = testSubject.getCommandLine(data);

        expect(commandLine).toEqual('/bin/bash -c \'start-runner.sh "id1" "name1" "baseUrl1" "scanUrl1" "serviceTreeId1"\'');
    });

    it('returns resourceFiles', () => {
        expect(testSubject.resourceFiles).toEqual([
            {
                autoStorageContainerName: 'batch-runner-script',
            },
        ] as typeof testSubject.resourceFiles);
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
