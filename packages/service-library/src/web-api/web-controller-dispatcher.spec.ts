// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { Container } from 'inversify';
import { ContextAwareLogger, loggerTypes } from 'logger';
import { IMock, Mock } from 'typemoq';
import { WebController } from './web-controller';
import { WebControllerDispatcher } from './web-controller-dispatcher';

// tslint:disable: no-any no-unsafe-any

export class TestableWebController extends WebController {
    public static readonly handleRequestResult = 'handle-request-result';
    public readonly apiVersion = '1.0';
    public readonly apiName = 'controller-mock-api';
    public requestArgs: any[];

    public async invoke(requestContext: Context, ...args: any[]): Promise<unknown> {
        this.context = requestContext;
        this.requestArgs = args;

        return TestableWebController.handleRequestResult;
    }

    protected validateRequest(...args: any[]): boolean {
        return true;
    }

    protected async handleRequest(...args: any[]): Promise<void> {
        return;
    }
}

describe(WebControllerDispatcher, () => {
    let webControllerDispatcher: WebControllerDispatcher;
    let containerMock: IMock<Container>;
    let context: Context;
    let testableWebController: TestableWebController;
    let processLifeCycleContainerMock: IMock<Container>;
    let contextAwareLoggerMock: IMock<ContextAwareLogger>;

    beforeEach(() => {
        context = <Context>(<unknown>{ bindingDefinitions: {} });
        contextAwareLoggerMock = Mock.ofType(ContextAwareLogger);
        testableWebController = new TestableWebController(contextAwareLoggerMock.object);

        containerMock = Mock.ofType(Container);
        processLifeCycleContainerMock = Mock.ofType(Container);

        containerMock.setup(c => c.get(TestableWebController)).returns(() => testableWebController);
    });

    it('should invoke controller instance with args', async () => {
        webControllerDispatcher = new WebControllerDispatcher(processLifeCycleContainerMock.object);

        await webControllerDispatcher.processRequest(containerMock.object, TestableWebController, context, 1, 'a');

        expect(testableWebController.context).toEqual(context);
        expect(testableWebController.requestArgs).toEqual([1, 'a']);
    });

    it('should set base telemetry properties', async () => {
        let processStub: typeof process;
        processStub = {
            env: {
                WEBSITE_INSTANCE_ID: 'server_id',
            },
        } as any;

        processLifeCycleContainerMock.setup(c => c.get(loggerTypes.Process)).returns(() => processStub);

        webControllerDispatcher = new WebControllerDispatcher(processLifeCycleContainerMock.object);

        expect((webControllerDispatcher as any).getTelemetryBaseProperties()).toEqual({
            source: 'azure-function',
            serverInstanceId: 'server_id',
        });
    });

    it('should do nothing on invoking custom action', async () => {
        webControllerDispatcher = new WebControllerDispatcher(processLifeCycleContainerMock.object);

        expect((webControllerDispatcher as any).runCustomAction()).toResolve();
    });

    it('return result of invoke', async () => {
        webControllerDispatcher = new WebControllerDispatcher(processLifeCycleContainerMock.object);
        await expect(webControllerDispatcher.processRequest(containerMock.object, TestableWebController, context)).resolves.toBe(
            TestableWebController.handleRequestResult,
        );
    });
});
