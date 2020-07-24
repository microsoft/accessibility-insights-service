// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-implicit-dependencies

import { BatchServiceModels } from '@azure/batch';
import { BatchTaskPropertyProvider } from 'azure-services';
import { EnvironmentSettings, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';

@injectable()
export class ScannerBatchTaskPropertyProvider extends BatchTaskPropertyProvider {
    constructor(
        @inject(EnvironmentSettings) private readonly environmentSettings: EnvironmentSettings,
        @inject(ServiceConfiguration) serviceConfig: ServiceConfiguration,
    ) {
        super(serviceConfig, 'start-web-api-scan-runner.sh', ['id', 'url', 'priority']);
    }

    public getEnvironmentSettings(): BatchServiceModels.EnvironmentSetting[] {
        return [
            {
                name: 'APPINSIGHTS_INSTRUMENTATIONKEY',
                value: this.environmentSettings.getValue('APPINSIGHTS_INSTRUMENTATIONKEY'),
            },
            {
                name: 'KEY_VAULT_URL',
                value: this.environmentSettings.getValue('KEY_VAULT_URL'),
            },
        ];
    }

    protected getResourceContainerNames(): string[] {
        return [this.environmentSettings.getValue('RUNNER_SCRIPTS_CONTAINER_NAME'), 'runtime-configuration'];
    }
}
