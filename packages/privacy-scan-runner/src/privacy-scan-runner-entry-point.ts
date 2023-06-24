// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { Runner } from './runner/runner';

export class PrivacyScanRunnerEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'privacyScanRunner' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        process.env.NETWORK_TRACE = 'true';

        const logger = container.get(ContextAwareLogger);
        await logger.setup();

        const runner = container.get<Runner>(Runner);
        await runner.run();
    }
}
