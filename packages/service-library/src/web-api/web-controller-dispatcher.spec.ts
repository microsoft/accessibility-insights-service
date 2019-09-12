// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { DotenvConfigOutput } from 'dotenv';
import { Container } from 'inversify';
import { BaseTelemetryProperties, Logger, loggerTypes } from 'logger';
import { IMock, Mock } from 'typemoq';
import { WebController } from './web-controller';
import { WebControllerDispatcher } from './web-controller-dispatcher';

// tslint:disable: no-any

let webControllerDispatcher: WebControllerDispatcher;
let containerMock: IMock<Container>;
let loggerMock: IMock<Logger>;
let dotEnvConfigStub: DotenvConfigOutput;
let baseTelemetryProperties: BaseTelemetryProperties;
let context: Context;
let testableWebController: TestableWebController;

export class TestableWebController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'controller-mock-api';
    public requestArgs: any[];

    public async invoke(requestContext: Context, ...args: any[]): Promise<void> {
        this.context = requestContext;
        this.requestArgs = args;

        return;
    }

    protected validateRequest(...args: any[]): boolean {
        return true;
    }

    protected async handleRequest(...args: any[]): Promise<void> {
        return;
    }
}

beforeEach(() => {
    dotEnvConfigStub = {};
    baseTelemetryProperties = { source: 'azure-function', api: 'controller-mock-api', version: '1.0', controller: 'TestableWebController' };
    context = <Context>(<unknown>{ bindingDefinitions: {} });
    testableWebController = new TestableWebController();

    containerMock = Mock.ofType(Container);
    containerMock
        .setup(c => c.get(loggerTypes.DotEnvConfig))
        .returns(() => dotEnvConfigStub)
        .verifiable();
    containerMock
        .setup(c => c.get(Logger))
        .returns(() => loggerMock.object)
        .verifiable();
    containerMock
        .setup(c => c.get(TestableWebController))
        .returns(() => testableWebController)
        .verifiable();

    loggerMock = Mock.ofType(Logger);
    loggerMock
        .setup(async l => l.setup(baseTelemetryProperties))
        .returns(async () => Promise.resolve())
        .verifiable();
});

afterEach(() => {
    loggerMock.verifyAll();
    containerMock.verifyAll();
});

describe(WebControllerDispatcher, () => {
    it('should invoke controller instance', async () => {
        webControllerDispatcher = new WebControllerDispatcher(TestableWebController, containerMock.object);
        await webControllerDispatcher.start(context);
        expect(testableWebController.context).toEqual(context);
    });

    it('should invoke controller instance with args', async () => {
        webControllerDispatcher = new WebControllerDispatcher(TestableWebController, containerMock.object);
        await webControllerDispatcher.start(context, 1, 'a');
        expect(testableWebController.context).toEqual(context);
        expect(testableWebController.requestArgs).toEqual([1, 'a']);
    });

    it('should fail when no context provided', async () => {
        webControllerDispatcher = new WebControllerDispatcher(TestableWebController, containerMock.object);
        await expect(webControllerDispatcher.start({ prop: 'prop-a' })).rejects.toThrowError(
            /The first argument should be type of Azure Functions Context./,
        );
    });
});
