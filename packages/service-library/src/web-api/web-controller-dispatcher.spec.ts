// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { Container } from 'inversify';
import { ContextAwareLogger, loggerTypes } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { WebController } from './web-controller';
import { WebControllerDispatcher } from './web-controller-dispatcher';

// tslint:disable: no-any no-unsafe-any
export class TestableWebControllerDispatcher extends WebControllerDispatcher {
    public shouldExitAfterExecution(): boolean {
        return this.shouldExitAfterInvocation();
    }
}

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
    let webControllerDispatcher: TestableWebControllerDispatcher;
    let containerMock: IMock<Container>;
    let context: Context;
    let testableWebController: TestableWebController;
    let processLifeCycleContainerMock: IMock<Container>;
    let loggerMock: IMock<MockableLogger>;

    beforeEach(() => {
        context = <Context>(<unknown>{ bindingDefinitions: {} });
        loggerMock = Mock.ofType(MockableLogger);
        testableWebController = new TestableWebController(loggerMock.object);

        containerMock = Mock.ofType(Container);
        processLifeCycleContainerMock = Mock.ofType(Container);

        containerMock.setup((c) => c.get(TestableWebController)).returns(() => testableWebController);
        containerMock.setup((c) => c.get(ContextAwareLogger)).returns(() => loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
        containerMock.verifyAll();
        processLifeCycleContainerMock.verifyAll();
    });

    it('should invoke controller instance with args', async () => {
        webControllerDispatcher = new TestableWebControllerDispatcher(processLifeCycleContainerMock.object);

        loggerMock
            .setup((l) => l.setup())
            .returns(() => Promise.resolve())
            .verifiable(Times.once());

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

        processLifeCycleContainerMock.setup((c) => c.get(loggerTypes.Process)).returns(() => processStub);

        webControllerDispatcher = new TestableWebControllerDispatcher(processLifeCycleContainerMock.object);

        expect((webControllerDispatcher as any).getTelemetryBaseProperties()).toEqual({
            source: 'azure-function',
            serverInstanceId: 'server_id',
        });
    });

    it('should do nothing on invoking custom action', async () => {
        webControllerDispatcher = new TestableWebControllerDispatcher(processLifeCycleContainerMock.object);

        await expect((webControllerDispatcher as any).runCustomAction()).toResolve();
    });

    it('return result of invoke', async () => {
        loggerMock
            .setup((l) => l.setup())
            .returns(() => Promise.resolve())
            .verifiable(Times.once());

        webControllerDispatcher = new TestableWebControllerDispatcher(processLifeCycleContainerMock.object);
        await expect(webControllerDispatcher.processRequest(containerMock.object, TestableWebController, context)).resolves.toBe(
            TestableWebController.handleRequestResult,
        );
    });

    it('returns false for shouldExitAfterInvocation', async () => {
        webControllerDispatcher = new TestableWebControllerDispatcher(processLifeCycleContainerMock.object);
        expect(webControllerDispatcher.shouldExitAfterExecution()).toBe(false);
    });
});
