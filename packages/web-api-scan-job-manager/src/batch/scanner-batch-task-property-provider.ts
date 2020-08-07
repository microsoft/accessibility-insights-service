// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BatchTaskPropertyProvider } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';

@injectable()
export class ScannerBatchTaskPropertyProvider extends BatchTaskPropertyProvider {
    constructor(@inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration) {
        super();
    }

    public async getImageName(): Promise<string> {
        return (await this.serviceConfig.getConfigValue('jobManagerConfig')).scanRunnerTaskImageName;
    }

    public getAdditionalContainerRunOptions?(): string {
        return '--cap-add=SYS_ADMIN';
    }
}
