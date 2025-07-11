// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { BaseTelemetryProperties, GlobalLogger } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { OnDemandDispatcher } from './sender/on-demand-dispatcher';

export class WebApiScanRequestSenderEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'webApiScanRequestSender' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        const logger = container.get(GlobalLogger);
        await logger.setup();

        const dispatcher = container.get(OnDemandDispatcher);
        await dispatcher.dispatchScanRequests();

        logger.logInfo(`Scan requests sent successfully.`);
    }
}
