// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context } from '@azure/functions';
import { Container } from 'inversify';
import { BaseTelemetryProperties } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { ApiController } from './controllers/api-controller';
import { Newable, webApiIocTypes } from './setup-ioc-container';

// tslint:disable: no-any no-unsafe-any

export class ControllerDispatcher extends ProcessEntryPointBase {
    private readonly controller: ApiController;

    constructor(private readonly controllerType: Newable<ApiController>, context: Context, container: Container) {
        super(container);
        container.bind(webApiIocTypes.azureFunctionContext).toConstantValue(context);
        this.controller = container.get(this.controllerType);
    }

    protected async runCustomAction(container: Container): Promise<void> {
        await this.controller.invoke();
    }

    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return {
            source: this.controller.apiName,
        };
    }
}
