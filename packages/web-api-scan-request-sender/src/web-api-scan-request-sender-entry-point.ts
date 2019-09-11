// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { BaseTelemetryProperties, Logger } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { DDispatcher } from './sender/dispatcher';

export class WebApiScanRequestSenderEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'webApiScanRequestSender' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        // Get dispatcher instance
        // Kick off the queuing.
        // Log the status
        const dispatcher = container.get(DDispatcher);
        const logger = container.get(Logger);
        await dispatcher.dispatchOnDemandScanRequests();
        logger.logInfo(`[Sender] Scan requests sent successfully`);
    }
}
