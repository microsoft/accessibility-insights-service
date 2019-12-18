// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { ApiController } from 'service-library';
import { processWebRequest } from './process-request';

let requestHandled: boolean;

type TestRequestResponse = {
    message: string;
    controller: TestableController;
};

class TestableController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'test api name';
    public readonly logger: Logger;
    protected readonly serviceConfig: ServiceConfiguration;

    // tslint:disable-next-line:no-any
    protected async handleRequest(...args: any[]): Promise<TestRequestResponse> {
        requestHandled = true;

        return {
            message: `request handled with args ${args.toString()}`,
            controller: this,
        };
    }
}

describe(processWebRequest, () => {
    let context: Context;

    beforeEach(() => {
        requestHandled = false;
        context = ({
            req: {
                query: { 'api-version': '1.0' },
            },
        } as unknown) as Context;
        process.env.APPINSIGHTS_INSTRUMENTATIONKEY = '00000000-0000-0000-0000-000000000000';
    });

    afterEach(() => {
        delete process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
    });

    it('Returns response from controller', async () => {
        const args = ['arg1', 'arg2'];

        const response = (await processWebRequest(context, TestableController, args)) as TestRequestResponse;

        expect(response.message).toBe(`request handled with args ${args.toString()}`);
    });

    it('new loggers are created for each request', async () => {
        const args = ['arg1', 'arg2'];

        const response1 = (await processWebRequest(context, TestableController, args)) as TestRequestResponse;
        expect(response1.controller).toBeDefined();
        const logger1 = response1.controller.logger;

        const response2 = (await processWebRequest(context, TestableController, args)) as TestRequestResponse;
        expect(response2.controller).toBeDefined();
        const logger2 = response2.controller.logger;

        expect(logger1).toBeDefined();
        expect(logger2).toBeDefined();
        expect(logger1).not.toBe(logger2);
    });
});
