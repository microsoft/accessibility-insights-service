// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Container } from 'inversify';
import { BaseEntryPoint, BaseTelemetryProperties } from 'logger';
import { Runner } from './runner/runner';

export class RunnerEntryPoint extends BaseEntryPoint {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'runner' };
    }
    protected async runCustomAction(container: Container): Promise<void> {
        const runner = container.get<Runner>(Runner);
        await runner.run();
    }
}
