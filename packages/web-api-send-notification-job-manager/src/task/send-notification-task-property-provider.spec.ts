// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { EnvironmentSettings, ServiceConfiguration } from 'common';
import { IMock, Mock } from 'typemoq';
import { SendNotificationTaskPropertyProvider } from './send-notification-task-property-provider';

// tslint:disable: no-object-literal-type-assertion

describe(SendNotificationTaskPropertyProvider, () => {
    let testSubject: SendNotificationTaskPropertyProvider;
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
        environmentSettingsMock.setup((s) => s.getValue('AZURE_STORAGE_NOTIFICATION_QUEUE')).returns(() => 'notification-queue-name');

        testSubject = new SendNotificationTaskPropertyProvider(environmentSettingsMock.object, serviceConfigMock.object);
    });

    it('builds command line', () => {
        const data = { scanId: 'id1', scanNotifyUrl: 'url1', runStatus: 'completed', scanStatus: 'failed', somOtherArg: 'some value' };

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
