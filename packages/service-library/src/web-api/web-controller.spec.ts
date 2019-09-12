// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { WebController } from './web-controller';

// tslint:disable: no-any

export class TestableWebController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'controller-mock-api';
    public validateRequestInvoked = false;
    public handleRequestInvoked = false;
    public requestArgs: any[];

    protected validateRequest(...args: any[]): boolean {
        this.validateRequestInvoked = true;

        return args[0] === 'valid';
    }

    protected async handleRequest(...args: any[]): Promise<void> {
        this.handleRequestInvoked = true;
        if (args[0] === undefined) {
            throw new Error('At least one parameter is expected');
        }

        return;
    }
}

let context: Context;

beforeEach(() => {
    context = <Context>(<unknown>{ bindingDefinitions: {} });
});

describe(WebController, () => {
    it('should handle request if request is valid', async () => {
        const controller = new TestableWebController();
        await controller.invoke(context, 'valid');
        expect(controller.validateRequestInvoked).toEqual(true);
        expect(controller.handleRequestInvoked).toEqual(true);
    });

    it('should not handle request if request is invalid', async () => {
        const controller = new TestableWebController();
        await controller.invoke(context, 'invalid');
        expect(controller.validateRequestInvoked).toEqual(true);
        expect(controller.handleRequestInvoked).toEqual(false);
    });
});
