// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context } from '@azure/functions';
import { Container, injectable } from 'inversify';
import { BaseTelemetryProperties } from 'logger';
import { ProcessEntryPointBase } from '../process-entry-point-base';
import { Newable } from './web-api-ioc-types';
import { WebController } from './web-controller';

// tslint:disable: no-any no-unsafe-any

@injectable()
export class WebControllerDispatcher extends ProcessEntryPointBase {
    private readonly controller: WebController;

    constructor(private readonly controllerType: Newable<WebController>, container: Container) {
        super(container);
        this.controller = container.get(this.controllerType);
    }

    protected async runCustomAction(container: Container, ...args: any[]): Promise<void> {
        if ((args[0] as Context).bindingDefinitions !== undefined) {
            await this.controller.invoke(<Context>args[0], ...args.slice(1));
        } else {
            throw new Error('The first argument should be type of Azure Functions Context.');
        }
    }

    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return {
            source: 'azure-function',
            api: this.controller.apiName,
            version: this.controller.apiVersion,
            controller: this.controllerType.name,
        };
    }
}
