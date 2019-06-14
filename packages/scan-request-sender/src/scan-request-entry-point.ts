// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Container } from 'inversify';
import { BaseTelemetryProperties, Logger } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { Dispatcher } from './sender/dispatcher';

export class ScanRequestEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'scanRequestSender' };
    }
    protected async runCustomAction(container: Container): Promise<void> {
        const dispatcher = container.get(Dispatcher);
        const logger = container.get(Logger);
        await dispatcher.dispatchScanRequests();
        logger.logInfo(`[Sender] scan request sent successfully`);
    }
}
