// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { BaseTelemetryProperties } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { Runner } from './runner/runner';

export class WebApiScanRunnerEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'webApiScanRunner' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        const runner = container.get<Runner>(Runner);
        await runner.run();
    }
}
