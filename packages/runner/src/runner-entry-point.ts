// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { Runner } from './runner/runner';

export class RunnerEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'runner' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        await container.get(ContextAwareLogger).setup();

        const runner = container.get<Runner>(Runner);
        await runner.run();
    }
}
