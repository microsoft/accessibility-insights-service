// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger, loggerTypes } from 'logger';
import { ProcessEntryPointBase } from '../process-entry-point-base';
import { Newable } from './web-api-ioc-types';
import { AppContext, WebController } from './web-controller';

/* eslint-disable @typescript-eslint/no-explicit-any */

export class WebControllerDispatcher extends ProcessEntryPointBase {
    constructor(private readonly processLifeCycleContainer: Container) {
        super(processLifeCycleContainer);
    }

    public async processRequest(
        container: Container,
        controllerType: Newable<WebController>,
        appContext: AppContext,
        ...args: any[]
    ): Promise<any> {
        const logger = container.get(ContextAwareLogger);
        await logger.setup();

        const controller = container.get(controllerType) as WebController;

        return controller.invoke(appContext, ...args);
    }

    // eslint-disable-next-line no-empty,@typescript-eslint/no-empty-function, @typescript-eslint/no-explicit-any
    protected async runCustomAction(container: Container, ...args: any[]): Promise<void> {}

    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        const currentProcess: typeof process = this.processLifeCycleContainer.get(loggerTypes.Process);

        return {
            source: 'azure-function',
            serverInstanceId: currentProcess.env.WEBSITE_INSTANCE_ID,
        };
    }
}
