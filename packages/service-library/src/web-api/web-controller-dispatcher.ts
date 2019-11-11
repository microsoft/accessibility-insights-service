// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context } from '@azure/functions';
import { Container } from 'inversify';
import { BaseTelemetryProperties, loggerTypes } from 'logger';
import { ProcessEntryPointBase } from '../process-entry-point-base';
import { Newable } from './web-api-ioc-types';
import { WebController } from './web-controller';

export class WebControllerDispatcher extends ProcessEntryPointBase {
    constructor(private readonly processLifeCycleContainer: Container) {
        super(processLifeCycleContainer);
    }

    public async processRequest(
        container: Container,
        controllerType: Newable<WebController>,
        context: Context,
        ...args: unknown[]
    ): Promise<unknown> {
        const controller = container.get(controllerType) as WebController;

        return controller.invoke(context, ...args);
    }

    // tslint:disable-next-line: no-empty no-any
    protected async runCustomAction(container: Container, ...args: unknown[]): Promise<void> {}

    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        const currentProcess: typeof process = this.processLifeCycleContainer.get(loggerTypes.Process);

        return {
            source: 'azure-function',
            serverInstanceId: currentProcess.env.WEBSITE_INSTANCE_ID,
        };
    }
}
