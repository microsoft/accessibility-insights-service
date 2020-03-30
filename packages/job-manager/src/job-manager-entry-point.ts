// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { Worker } from './worker/worker';

export class JobManagerEntryPoint extends ProcessEntryPointBase {
    protected async runCustomAction(container: Container): Promise<void> {
        await container.get(ContextAwareLogger).setup();

        const worker = container.get<Worker>(Worker);
        await worker.run();
    }

    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return {
            source: 'jobManager',
        };
    }
}
