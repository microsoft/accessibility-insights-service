// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { BaseTelemetryProperties } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { SendNotificationTaskCreator } from './task/send-notification-task-creator';

export class SendNotificationJobManagerEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'webApiSendNotificationJobManager' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        const taskCreator = container.get<SendNotificationTaskCreator>(SendNotificationTaskCreator);
        await taskCreator.init();
        await taskCreator.run();
    }
}
