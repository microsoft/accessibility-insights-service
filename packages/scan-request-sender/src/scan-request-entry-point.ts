// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger, GlobalLogger, Logger } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { Dispatcher } from './sender/dispatcher';

export class ScanRequestEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'scanRequestSender' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        await container.get(ContextAwareLogger).setup();

        const dispatcher = container.get(Dispatcher);
        const logger = container.get(GlobalLogger);
        await dispatcher.dispatchScanRequests();
        logger.logInfo(`[Sender] Scan requests sent successfully`);
    }
}
