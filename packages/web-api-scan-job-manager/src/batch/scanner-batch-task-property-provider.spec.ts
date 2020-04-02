// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { EnvironmentSettings, ServiceConfiguration } from 'common';
import { IMock, Mock } from 'typemoq';
import { ScannerBatchTaskPropertyProvider } from './scanner-batch-task-property-provider';

// tslint:disable: no-object-literal-type-assertion

describe(ScannerBatchTaskPropertyProvider, () => {
    let testSubject: ScannerBatchTaskPropertyProvider;
    let environmentSettingsMock: IMock<EnvironmentSettings>;
    const appInsightsKey = 'app insights key1';
    const keyVaultUrl = 'key vault url1';
    const runnerScriptContainerName = 'runner script container';
    let serviceConfigMock: IMock<ServiceConfiguration>;

    beforeEach(() => {
        serviceConfigMock = Mock.ofType(ServiceConfiguration);

        environmentSettingsMock = Mock.ofType(EnvironmentSettings);
        environmentSettingsMock.setup((s) => s.getValue('APPINSIGHTS_INSTRUMENTATIONKEY')).returns(() => appInsightsKey);
        environmentSettingsMock.setup((s) => s.getValue('KEY_VAULT_URL')).returns(() => keyVaultUrl);
        environmentSettingsMock.setup((s) => s.getValue('RUNNER_SCRIPTS_CONTAINER_NAME')).returns(() => runnerScriptContainerName);

        testSubject = new ScannerBatchTaskPropertyProvider(environmentSettingsMock.object, serviceConfigMock.object);
    });

    it('builds command line', () => {
        const data = { id: 'id1', url: 'url1', priority: 1 };

        expect(testSubject.getCommandLine(JSON.stringify(data))).toMatchSnapshot();
    });

    it('returns resourceFiles', () => {
        expect(testSubject.getResourceFiles()).toMatchSnapshot();
    });

    describe('environment settings', () => {
        it('builds environment settings', () => {
            expect(testSubject.getEnvironmentSettings()).toMatchSnapshot();
        });
    });
});
