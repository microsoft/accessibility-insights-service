// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { BaseTelemetryProperties, GlobalLogger } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { Runner } from './runner/runner';

export class ReportGeneratorRunnerEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'reportGeneratorRunner' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        const logger = container.get(GlobalLogger);
        await logger.setup();

        const runner = container.get<Runner>(Runner);
        await runner.run();
    }
}
