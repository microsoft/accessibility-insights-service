// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BatchTaskPropertyProvider, UserAccessLevels } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { inject, injectable, optional } from 'inversify';

@injectable()
export class SendNotificationTaskPropertyProvider extends BatchTaskPropertyProvider {
    constructor(@optional() @inject('ServiceConfiguration') private readonly serviceConfig: ServiceConfiguration) {
        super();
    }

    public async getImageName(): Promise<string> {
        return (await this.serviceConfig.getConfigValue('jobManagerConfig')).sendNotificationTaskImageName;
    }

    public getAdditionalContainerRunOptions?(): string {
        return '';
    }

    public getUserElevationLevel(): UserAccessLevels {
        return 'admin';
    }
}
