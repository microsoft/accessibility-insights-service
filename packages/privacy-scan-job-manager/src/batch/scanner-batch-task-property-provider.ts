// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BatchTaskPropertyProvider, UserAccessLevels } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';

@injectable()
export class ScannerBatchTaskPropertyProvider extends BatchTaskPropertyProvider {
    constructor(@inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration) {
        super();
    }

    public async getImageName(): Promise<string> {
        return (await this.serviceConfig.getConfigValue('jobManagerConfig')).privacyScanRunnerTaskImageName;
    }

    public getAdditionalContainerRunOptions?(): string {
        // IP Geolocation data file
        const geolocationFile = process.env.AZ_BATCH_NODE_SHARED_DIR.endsWith('\\')
            ? `${process.env.AZ_BATCH_NODE_SHARED_DIR}.env`
            : `${process.env.AZ_BATCH_NODE_SHARED_DIR}\\.env`;

        return `--env-file ${geolocationFile}`;
    }

    public getUserElevationLevel(): UserAccessLevels {
        return 'admin';
    }
}
