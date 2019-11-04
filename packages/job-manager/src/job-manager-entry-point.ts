// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Container } from 'inversify';
import { BaseTelemetryProperties } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { Worker } from './worker/worker';

export class JobManagerEntryPoint extends ProcessEntryPointBase {
    protected async runCustomAction(container: Container): Promise<void> {
        const worker = container.get<Worker>(Worker);
        await worker.run();
    }

    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return {
            source: 'jobManager',
        };
    }
}
