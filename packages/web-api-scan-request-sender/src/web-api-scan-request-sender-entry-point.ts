// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { OnDemandDispatcher } from './sender/on-demand-dispatcher';

export class WebApiScanRequestSenderEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'webApiScanRequestSender' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        const logger = container.get(ContextAwareLogger);
        await logger.setup();

        const dispatcher = container.get(OnDemandDispatcher);
        await dispatcher.dispatchOnDemandScanRequests();

        logger.logInfo(`Scan requests sent successfully.`);
    }
}
