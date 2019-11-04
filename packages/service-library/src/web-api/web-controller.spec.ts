// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { WebController } from './web-controller';

// tslint:disable: no-any no-unsafe-any

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
    context = <Context>(<unknown>{ bindingDefinitions: {}, res: {} });
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

    it('should add content-type response header if no any', async () => {
        const controller = new TestableWebController();
        await controller.invoke(context, 'valid');
        expect(controller.context.res.headers['content-type']).toEqual('application/json; charset=utf-8');
    });

    it('should add content-type response header if if other', async () => {
        const controller = new TestableWebController();
        context.res.headers = {
            'content-length': 100,
        };
        await controller.invoke(context, 'valid');
        expect(controller.context.res.headers['content-type']).toEqual('application/json; charset=utf-8');
    });

    it('should skip adding content-type response header if any', async () => {
        const controller = new TestableWebController();
        context.res.headers = {
            'content-type': 'text/plain',
        };
        await controller.invoke(context, 'valid');
        expect(controller.context.res.headers['content-type']).toEqual('text/plain');
    });
});
