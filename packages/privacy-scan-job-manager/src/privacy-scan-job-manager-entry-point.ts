// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { Worker } from './worker/worker';

export class PrivacyScanJobManagerEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'privacyScanJobManager' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        const logger = container.get(ContextAwareLogger);
        await logger.setup();

        const worker = container.get<Worker>(Worker);
        await worker.init();
        await worker.run();
    }
}
