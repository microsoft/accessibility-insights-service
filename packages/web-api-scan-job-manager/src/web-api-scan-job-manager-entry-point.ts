// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { BaseTelemetryProperties } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { Worker } from './worker/worker';

export class WebApiScanJobManagerEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'webApiScanJobManager' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        const worker = container.get<Worker>(Worker);
        await worker.init();
        await worker.run();
    }
}
