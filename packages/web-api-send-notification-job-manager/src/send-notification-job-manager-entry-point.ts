// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { SendNotificationTaskCreator } from './task/send-notification-task-creator';

export class SendNotificationJobManagerEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'webApiSendNotificationJobManager' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        const logger = container.get(ContextAwareLogger);
        await logger.setup();

        const taskCreator = container.get<SendNotificationTaskCreator>(SendNotificationTaskCreator);
        await taskCreator.init();
        await taskCreator.run();
    }
}
